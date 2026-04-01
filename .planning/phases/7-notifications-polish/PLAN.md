# Phase 7: Notifications & Polish — Execution Plan

## Objective

Build an in-app notification system that proactively alerts HR, supervisors, and employees about attendance events (geofence violations, late arrivals, sync confirmations, daily anomaly summaries). Then polish the entire app — loading states, error boundaries, animations, performance — for a smooth demo experience.

## Prerequisites

- Phase 6 (Reports & HR Actions) verified — HR dashboard, reports, audit trail functional
- Existing attendance actions already compute: late status, geofence violations, overtime, anomalies
- Sonner toasts already mounted globally (transient feedback)
- Supabase Realtime available but unused — no channels or subscriptions exist yet
- Service worker exists for PWA but has no notification capability
- No `loading.tsx`, `error.tsx`, or `not-found.tsx` files exist anywhere

## Implementation Steps

---

### Wave 1: Notification Foundation (Database + Types)

#### Step 1.1: Database Migration — `notifications` Table

**Apply via Supabase MCP:**

```sql
-- In-app notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  -- Types: 'geofence_violation', 'late_arrival', 'daily_anomaly_summary',
  --        'sync_confirmation', 'overtime_pending', 'warning_issued',
  --        'registration_approved', 'registration_rejected'
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}',
  -- metadata stores: { employee_id, attendance_id, location_id, etc. }
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Users can update (mark read) their own notifications
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Server actions insert via admin client (service_role), no insert policy needed for users
-- But allow service-level inserts:
CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_officer', 'supervisor'))
    OR auth.uid() = recipient_id
  );
```

**Acceptance criteria:**
- Table created with RLS enabled
- Users can only see/update their own notifications
- Indexed for recipient + read status + chronological queries

#### Step 1.2: Types & Validations

**Files to create:**
- `src/lib/validations/notifications.ts`

```typescript
// Notification types enum
export type NotificationType =
  | 'geofence_violation'    // NTF-01: HR alert
  | 'late_arrival'          // NTF-03: Supervisor alert
  | 'daily_anomaly_summary' // NTF-02: HR daily digest
  | 'sync_confirmation'     // NTF-04: Employee sync success
  | 'overtime_pending'      // HR: new overtime to review
  | 'warning_issued'        // Employee: warning received
  | 'registration_approved' // Employee: account approved
  | 'registration_rejected' // User: account rejected

// Notification record shape
export interface Notification {
  id: string
  recipient_id: string
  type: NotificationType
  title: string
  body: string
  metadata: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

// Zod schema for creating notifications (server-side)
export const createNotificationSchema = z.object({
  recipient_id: z.string().uuid(),
  type: z.enum([...notificationTypes]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
})
```

**Acceptance criteria:**
- Types exported and used by all notification code
- `npx tsc --noEmit` passes

---

### Wave 2: Notification Server Actions

#### Step 2.1: Core Notification CRUD

**Files to create:**
- `src/actions/notifications.ts`

**Actions:**

1. **`getNotificationsAction(limit?: number)`**
   - Fetch current user's notifications, ordered by `created_at DESC`
   - Default limit: 50
   - Returns `Notification[]`

2. **`getUnreadCountAction()`**
   - `SELECT COUNT(*) FROM notifications WHERE recipient_id = auth.uid() AND is_read = false`
   - Returns `{ count: number }`

3. **`markNotificationReadAction(notificationId: string)`**
   - Update `is_read = true, read_at = now()` for the given notification
   - Verify ownership via RLS

4. **`markAllReadAction()`**
   - Update all unread notifications for current user
   - Returns count of updated rows

5. **`deleteNotificationAction(notificationId: string)`**
   - Hard delete a single notification (user's own only)

6. **`notifySyncCompletionAction(syncedCount: number)`** — NTF-04
   - Server action callable from client code (safe — uses `requireAuth()` to get user identity)
   - Creates notification for the calling user: "{count} offline check-in(s) synced successfully"
   - Uses admin client internally to insert the notification row
   - metadata: `{ synced_count, synced_at }`
   - This exists as a server action (not a helper) because the sync engine is client-side and cannot use service_role directly

**Acceptance criteria:**
- All actions use `requireAuth()`
- RLS ensures users only access own notifications
- `revalidatePath` on mutations

#### Step 2.2: Notification Creation Helpers (Server-Side)

**Files to create:**
- `src/lib/notifications/create.ts`

**Helper functions (used by attendance actions, not exposed as server actions):**

1. **`notifyGeofenceViolation(employeeName, locationName, attendanceId)`** — NTF-01
   - Find all hr_officer + admin profiles
   - Insert a notification for each: "Geofence violation: {employee} checked in outside {location}"
   - metadata: `{ employee_id, attendance_id, location_id }`

2. **`notifyLateArrival(employeeName, locationName, minutesLate, locationId, attendanceId)`** — NTF-03
   - Find supervisors for the location via: `from('employees').select('profile_id').eq('primary_location_id', locationId)` then join `profiles` where `role = 'supervisor'`
   - Insert a notification for each supervisor: "{employee} is {minutes}min late at {location}"
   - metadata: `{ employee_id, attendance_id, location_id }`

3. **`notifyDailyAnomalySummary()`** — NTF-02
   - Query today's anomalies: geofence violations, late arrivals, missing check-outs
   - Build summary text: "Today: {X} late, {Y} geofence violations, {Z} missing clock-outs"
   - Insert one notification per hr_officer/admin
   - metadata: `{ date, late_count, violation_count, missing_clockout_count }`

All helpers use the admin Supabase client (service_role, server-side only) to insert notifications for any recipient.

**Note:** There is no `notifySyncConfirmation` helper here. NTF-04 (sync confirmation) is handled via a dedicated server action (see Step 2.1 action #6) because the sync engine runs client-side and cannot call service_role helpers directly.

**Acceptance criteria:**
- Helpers are pure server-side functions (not in any client bundle)
- Each helper inserts correctly typed notifications
- No service_role key exposed to client

---

### Wave 3: Notification UI

#### Step 3.1: Install Required shadcn Components

**Commands:**
```bash
npx shadcn@latest add popover scroll-area skeleton tabs tooltip switch sheet
```

These are needed across notification UI and polish work.

#### Step 3.2: Notification Bell + Dropdown

**Files to create:**
- `src/components/notifications/notification-bell.tsx` — Bell icon with unread badge in topbar
- `src/components/notifications/notification-dropdown.tsx` — Popover panel listing recent notifications
- `src/components/notifications/notification-item.tsx` — Single notification row (icon, title, time, read status)

**Design:**
- Bell icon (lucide `Bell`) placed in topbar between connection status and user dropdown
- Unread count badge: small red circle with count (max "9+")
- Click opens a `Popover` (desktop) or `Sheet` bottom drawer (mobile)
- Dropdown shows last 10 notifications with:
  - Type-specific icon (AlertTriangle for geofence, Clock for late, CheckCircle for sync, FileText for summary)
  - Title (bold if unread)
  - Relative timestamp ("2m ago", "1h ago")
  - Click marks as read + navigates to relevant page (if applicable)
- Footer: "Mark all read" button + "View all" link to `/dashboard/notifications`

**Realtime updates:**
- Subscribe to Supabase Realtime channel `notifications:recipient_id=eq.{userId}` for INSERT events
- On new notification: increment unread count badge, prepend to dropdown list, show sonner toast

**Topbar wiring** (`src/components/layout/topbar.tsx`):
- `Topbar` already receives `profile` prop and is `"use client"`
- Insert `<NotificationBell userId={profile.id} />` between `<ConnectionStatus />` and the user `<DropdownMenu>`

```tsx
// Modified topbar layout (right section):
<div className="flex items-center gap-2">
  <ConnectionStatus />
  <NotificationBell userId={profile.id} />
  <DropdownMenu>...</DropdownMenu>
</div>
```

**Acceptance criteria:**
- Bell shows in topbar for all roles
- Unread badge updates in real-time (no page refresh needed)
- Dropdown renders correctly on mobile (sheet) and desktop (popover)
- Clicking a notification marks it read

#### Step 3.3: Notifications Full Page

**Files to create:**
- `src/app/(dashboard)/dashboard/notifications/page.tsx` — Full notifications list page
- `src/components/notifications/notifications-page.tsx` — Client component with filters

**Layout:**
- Header: "Notifications" + "Mark all read" button
- Filter tabs: All | Unread | by type (geofence, late, summary, sync)
- List of `NotificationItem` components with full body text
- Empty state: illustration + "You're all caught up" message
- Infinite scroll or "Load more" pagination

**Navigation wiring:**

Sidebar (`src/components/layout/sidebar.tsx`) — add to `navItems` array:
```typescript
{
  label: "Notifications",
  href: "/dashboard/notifications",
  icon: Bell, // from lucide-react
  roles: ["admin", "hr_officer", "supervisor", "employee"],
}
```

Mobile nav (`src/components/layout/mobile-nav.tsx`) — add to each role's tabs in `getTabsForRole()`:
```typescript
{ label: "Alerts", href: "/dashboard/notifications", icon: Bell }
```
Plus a notification indicator dot (red circle) on the tab when unread count > 0.

**Acceptance criteria:**
- Page accessible at `/dashboard/notifications`
- Filters work correctly
- Empty state displays when no notifications
- Accessible via sidebar and "View all" from dropdown

---

### Wave 4: Wire Notification Triggers

#### Step 4.1: Attendance Action Integration

**Files to modify:**
- `src/actions/attendance.ts` — `clockInAction`, `clockOutAction`

**Changes to `clockInAction`:**
- After successful clock-in, if `clock_in_within_geofence === false`:
  - Call `notifyGeofenceViolation(employeeName, locationName, attendanceId)` — NTF-01
- After successful clock-in, if status is `'late'`:
  - Find supervisors for the location
  - Call `notifyLateArrival(employeeName, locationName, minutesLate, supervisorIds)` — NTF-03

**Changes to `clockOutAction`:**
- No new notifications needed (early departure is tracked but not alerted per requirements)

**Fire-and-forget pattern:**
- Notification creation should NOT block the attendance response
- Wrap in `Promise.resolve().then(() => notifyX(...))` or use `void notifyX(...)` after returning the response
- Log errors but don't fail the clock-in/out action

**Acceptance criteria:**
- Geofence violation creates notifications for all HR officers and admins
- Late arrival creates notifications for location supervisors
- Clock-in/out actions are not slowed down by notification creation
- Notifications appear in real-time for recipients

#### Step 4.2: Sync Completion Notification — NTF-04

**Architecture note:** The sync engine (`src/lib/pwa/sync-engine.ts`) is a **client-side** module. It cannot call server-side helpers that use `createAdminClient()`. Instead, the notification is triggered from the **component layer** that invokes sync.

**Files to modify:**
- `src/components/pwa/sync-provider.tsx` (or the component that calls `syncPendingActions()`)

**Changes:**
- After `syncPendingActions()` returns with `result.synced > 0`:
  - Call `notifySyncCompletionAction(result.synced)` (server action from Step 2.1 #6)
  - This server action uses `requireAuth()` to identify the user, then inserts the notification via admin client

```typescript
// In the sync completion handler (component layer):
import { notifySyncCompletionAction } from '@/actions/notifications'

const result = await syncPendingActions()
if (result.synced > 0) {
  // Fire-and-forget — don't block UI on notification creation
  void notifySyncCompletionAction(result.synced)
}
```

**Acceptance criteria:**
- Employee sees notification after offline check-ins sync
- Only fires when `synced > 0` (not on zero-sync or failures)
- Does NOT slow down the sync flow (fire-and-forget)

#### Step 4.3: Daily Anomaly Summary Trigger

**Approach:** Supabase Edge Function with `pg_cron` schedule (preferred for reliability) OR generate-on-dashboard-load (simpler for demo).

**Recommended for v1 demo — Dashboard-load approach:**

**Files to create:**
- `src/lib/notifications/daily-summary.ts` — `generateDailySummaryIfNeeded()`

**Logic:**
1. Check if a `daily_anomaly_summary` notification exists for today for the current HR user
2. If not, compute today's anomalies (late count, geofence violations, missing clock-outs)
3. If any anomalies found, create the summary notification
4. This runs when HR/admin loads the dashboard — ensures summary is generated once per day per user

**Files to modify:**
- `src/app/(dashboard)/dashboard/page.tsx` — Call `generateDailySummaryIfNeeded()` for hr_officer/admin before rendering

**Known limitations (acceptable for v1 demo):**
- Summary is only generated when HR opens the dashboard — if HR doesn't log in, no summary is created
- Summary reflects anomalies at time of first dashboard load, not end-of-day totals
- Each HR officer gets their own summary independently, potentially at different times
- **v2 improvement:** Replace with `pg_cron` Supabase Edge Function for reliable end-of-day summaries

**Acceptance criteria:**
- HR sees daily summary notification when opening dashboard
- Summary only generated once per day per user (idempotent)
- Shows actual anomaly counts from the current day

---

### Wave 5: Polish — Loading, Error States & Skeleton

#### Step 5.1: Loading States

**Files to create:**
- `src/app/(dashboard)/loading.tsx` — Dashboard layout skeleton
- `src/app/(dashboard)/dashboard/loading.tsx` — Dashboard page skeleton
- `src/app/(dashboard)/dashboard/reports/loading.tsx` — Reports page skeleton
- `src/app/(dashboard)/dashboard/employees/loading.tsx` — Employees page skeleton
- `src/app/(dashboard)/dashboard/locations/loading.tsx` — Locations page skeleton
- `src/app/(dashboard)/dashboard/shifts/loading.tsx` — Shifts page skeleton
- `src/app/(dashboard)/dashboard/notifications/loading.tsx` — Notifications page skeleton
- `src/app/(dashboard)/dashboard/hr-actions/loading.tsx` — HR actions page skeleton
- `src/app/(dashboard)/dashboard/attendance/loading.tsx` — Attendance page skeleton

**Pattern:**
- Use shadcn `<Skeleton>` component
- Match the actual page layout: skeleton cards for stat cards, skeleton rows for tables, skeleton rectangles for charts
- Consistent shimmer animation per DESIGN.md

**Acceptance criteria:**
- Every dashboard route shows a skeleton while loading (not a blank screen)
- Skeletons match the actual page structure closely
- Smooth transition from skeleton to content

#### Step 5.2: Error Boundaries

**Files to create:**
- `src/app/(dashboard)/error.tsx` — Dashboard error boundary
- `src/app/(dashboard)/dashboard/error.tsx` — Nested error boundary
- `src/app/not-found.tsx` — Custom 404 page

**Error boundary UI:**
- Centered error card with icon (AlertTriangle)
- "Something went wrong" heading
- Error message (in dev mode)
- "Try again" button calling `reset()`
- "Go to dashboard" fallback link

**404 page UI:**
- Centered: large "404" + "Page not found"
- "Back to Dashboard" button
- Consistent with app design system

**Acceptance criteria:**
- Errors caught and displayed with retry option (not white screen)
- 404 shows branded page instead of Next.js default
- Error boundaries don't break the overall layout

#### Step 5.3: Suspense Boundaries for Dashboard Sections

**Files to modify:**
- `src/app/(dashboard)/dashboard/page.tsx` — Wrap dashboard component in `<Suspense>`
- `src/components/dashboard/hr-dashboard.tsx` — Suspense around chart sections
- `src/components/dashboard/admin-dashboard.tsx` — Suspense around stats

**Pattern:**
- Use `<Suspense fallback={<DashboardSkeleton />}>` around data-dependent sections
- Allows progressive rendering: shell loads instantly, data sections stream in

**Acceptance criteria:**
- Dashboard shell renders immediately
- Data sections appear as they load
- No layout shift when data arrives

---

### Wave 6: Polish — Animations, Performance & Demo Prep

#### Step 6.1: Page Transition Animations

**Files to modify:**
- All dashboard page components (wrap content in animated container)

**Pattern:**
- Create a reusable `<PageTransition>` wrapper component
- Uses `tw-animate-css` classes: `animate-in fade-in slide-in-from-bottom-4 duration-300`
- Apply to all page-level components

**Acceptance criteria:**
- Pages fade in smoothly on navigation
- No janky jumps or layout shifts

#### Step 6.2: Micro-Interactions

**Files to modify:**
- `src/components/ui/card.tsx` — Add subtle hover lift
- `src/components/ui/button.tsx` — Add press feedback (`active:scale-[0.98]`)
- `src/components/notifications/notification-item.tsx` — Slide-in animation for new notifications
- `src/components/attendance/clock-in-button.tsx` — Enhanced success/failure animation

**Specific animations:**
- **Card hover**: `hover:translate-y-[-2px] transition-transform duration-150`
- **New notification**: Slide-in-from-right with fade
- **Clock-in success**: Scale pulse (1 -> 1.05 -> 1) + checkmark animation
- **Status badge**: Color fade transition (300ms)
- **Stat counters**: Count-up animation on dashboard load

**Acceptance criteria:**
- Interactions feel responsive and polished
- No animation jank on low-end devices (use `will-change` sparingly)
- Animations respect `prefers-reduced-motion`

#### Step 6.3: Performance Optimization

**Targets:**
- Dynamic import notification dropdown (heavy with Supabase Realtime)
- Dynamic import chart components in reports (recharts is large)
- Add `React.memo` to frequently re-rendered list items (NotificationItem, AttendanceRow)
- Ensure Supabase Realtime subscription is cleaned up on unmount
- Review and add `loading="lazy"` to any images

**Files to modify:**
- `src/components/notifications/notification-bell.tsx` — Dynamic import dropdown
- `src/components/reports/*` — Dynamic import chart components
- Various list item components — `React.memo` wrappers

**Acceptance criteria:**
- Initial bundle doesn't include recharts or notification dropdown
- No memory leaks from Realtime subscriptions
- Dashboard loads fast with progressive enhancement

#### Step 6.4: Mobile Polish Pass

**Files to modify:**
- `src/components/layout/mobile-nav.tsx` — Add notification badge indicator
- `src/components/notifications/notification-bell.tsx` — Use `Sheet` (bottom drawer) on mobile instead of `Popover`
- Various dashboard components — Verify touch targets >= 44px

**Acceptance criteria:**
- Notification indicator visible on mobile nav
- Notification panel opens as bottom sheet on mobile
- All interactive elements have adequate touch targets

#### Step 6.5: Demo Walkthrough Preparation

**Files to create:**
- `src/components/dashboard/welcome-banner.tsx` — Contextual welcome banner for first visit

**Changes:**
- Admin dashboard: Banner highlighting key features ("View reports, manage employees, monitor attendance")
- Employee dashboard: Simplified hero with prominent clock-in button
- Ensure all dashboards have data — no empty states visible in demo
- Verify all navigation flows work end-to-end

**Acceptance criteria:**
- A demo can walk through: login -> dashboard -> clock-in -> view attendance -> reports -> notifications without hitting any dead ends
- All pages populated with data
- No console errors in any flow

---

## Verification Checklist

- [ ] NTF-01: HR receives in-app notification when employee checks in outside geofence
- [ ] NTF-02: HR receives daily anomaly summary notification (generated on dashboard load)
- [ ] NTF-03: Supervisor receives late arrival notification when employee is late
- [ ] NTF-04: Employee receives sync confirmation notification after offline check-ins sync
- [ ] Bell icon shows unread count in topbar for all roles
- [ ] Notifications update in real-time via Supabase Realtime (no page refresh needed)
- [ ] Notification dropdown works on desktop (popover) and mobile (sheet)
- [ ] Full notifications page at `/dashboard/notifications` with filters
- [ ] Mark-as-read (individual + all) works correctly
- [ ] All dashboard routes have `loading.tsx` skeleton states
- [ ] Error boundaries catch and display errors with retry option
- [ ] Custom 404 page renders instead of Next.js default
- [ ] Page transition animations (fade-in, slide-up) on all routes
- [ ] Micro-interactions: card hover, button press, notification slide-in
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] Dynamic imports for recharts and notification dropdown
- [ ] No Supabase Realtime subscription memory leaks
- [ ] Mobile notification indicator on bottom nav
- [ ] All touch targets >= 44px on mobile
- [ ] Demo flow works end-to-end without dead ends or errors
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No service_role key exposed client-side
- [ ] RLS enforced on notifications table

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Supabase Realtime connection drops | Implement reconnection logic with exponential backoff; fall back to polling every 30s |
| Notification volume overwhelms HR (many employees = many alerts) | Daily summary (NTF-02) aggregates; individual alerts are grouped by type in UI; older notifications auto-cleaned after 30 days |
| Daily summary fires multiple times per day | Idempotency check — query for existing summary notification with today's date before creating |
| Notification bell re-renders entire app on count change | Isolate bell state with its own context/store; `React.memo` on bell component |
| `prefers-reduced-motion` not tested | Add explicit CSS media query to disable all `animate-*` classes; test with browser setting |
| Supabase Realtime requires specific RLS config | Ensure `notifications_select_own` policy works with Realtime's `postgres_changes` — may need to enable replication for notifications table |

## Estimated Scope

- **New files:** ~25 (notification actions, components, loading/error pages, helpers)
- **Modified files:** ~12 (attendance actions, sync engine, topbar, sidebar, mobile-nav, dashboard page, card/button components)
- **New DB table:** 1 (notifications)
- **New shadcn components:** ~7 (popover, scroll-area, skeleton, tabs, tooltip, switch, sheet)
- **New packages:** 0 (all dependencies already installed)

---
*Plan created: 2026-04-01*

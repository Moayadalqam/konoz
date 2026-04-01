# Phase 3: Attendance Core — Execution Plan

## Objective

Enable employees to clock in/out with GPS verification against their assigned location's geofence. Give supervisors a live dashboard of their site's attendance and the ability to bulk-check-in workers without phones. All attendance records are timestamped, geotagged, and queryable.

**Note:** Offline/PWA is Phase 5. This phase assumes online connectivity. The schema is designed to support offline sync fields (`synced_at`, `client_created_at`) so Phase 5 can add offline without schema changes.

## Prerequisites

- Phase 2 complete: `locations` and `employees` tables exist with real seed data (8 locations, 70 employees)
- Existing helper functions: `get_user_role()`, `is_user_approved()`, `get_employee_location()`
- Existing auth DAL: `requireAuth()`, `requireRole()` in `src/lib/auth/dal.ts`
- Existing action patterns in `src/actions/employees.ts` and `src/actions/locations.ts`
- Read Next.js 16+ docs in `node_modules/next/dist/docs/` before writing pages

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Haversine in app layer, not PostGIS | Phase 2 used simple lat/lng (not PostGIS geography). Haversine is sufficient for 8 locations with circular geofences. Keep consistent. |
| `attendance_records` references `employees.id`, not `auth.uid()` | Not all employees have app accounts (laborers without phones). Supervisor batch clock-in creates records for employees by `employee_id`. |
| `submitted_by` tracks who submitted | For self clock-in: `submitted_by = employee_id`. For supervisor batch: `submitted_by = supervisor's employee_id`. Audit trail. |
| `client_created_at` always populated | Even for online-only Phase 3, set `client_created_at = now()`. Phase 5 will use this for conflict resolution. |
| No shift linking in Phase 3 | `shift_id` column exists (nullable) but shift logic is Phase 4. Late/early detection deferred. |
| Helper function for employee lookup | `get_employee_id_for_user(auth.uid())` — SECURITY DEFINER function to resolve current user's employee record without RLS recursion. |
| Status defaults to 'present' | Phase 3 only tracks present/absent. Late/early/overtime status set by Phase 4 shift logic. |
| GPS accuracy stored | Record `clock_in_accuracy` and `clock_out_accuracy` to detect spoofing in server-side validation. |

## Implementation Steps

### Step 1: Database Migration — Attendance Records Table

Create the `attendance_records` table and related helper functions.

**File:** Supabase migration via MCP

**Schema:**

```sql
-- attendance_records: core fact table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  shift_id UUID,  -- Phase 4 will add FK to shifts table

  -- Clock times
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,

  -- GPS coordinates
  clock_in_lat DOUBLE PRECISION NOT NULL,
  clock_in_lng DOUBLE PRECISION NOT NULL,
  clock_in_accuracy DOUBLE PRECISION,  -- meters, from Geolocation API
  clock_out_lat DOUBLE PRECISION,
  clock_out_lng DOUBLE PRECISION,
  clock_out_accuracy DOUBLE PRECISION,

  -- Geofence validation
  clock_in_within_geofence BOOLEAN NOT NULL DEFAULT TRUE,
  clock_out_within_geofence BOOLEAN,

  -- Method tracking
  clock_in_method TEXT NOT NULL DEFAULT 'self'
    CHECK (clock_in_method IN ('self', 'supervisor_batch', 'manual_correction')),
  clock_out_method TEXT
    CHECK (clock_out_method IN ('self', 'supervisor_batch', 'manual_correction', 'auto_shift_end')),

  -- Status (Phase 3: present/absent only; Phase 4 adds late/early/overtime)
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'late', 'early_departure', 'absent', 'on_leave')),

  -- Calculated fields (Phase 4 populates overtime)
  total_minutes INTEGER,
  is_overtime BOOLEAN NOT NULL DEFAULT FALSE,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,

  -- Audit
  notes TEXT,
  submitted_by UUID REFERENCES public.employees(id),
  is_corrected BOOLEAN NOT NULL DEFAULT FALSE,

  -- Sync support (for Phase 5 offline)
  synced_at TIMESTAMPTZ DEFAULT now(),  -- NULL = not yet synced (offline origin)
  client_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_attendance_employee_date ON public.attendance_records (employee_id, clock_in DESC);
CREATE INDEX idx_attendance_location_date ON public.attendance_records (location_id, clock_in DESC);
CREATE INDEX idx_attendance_date ON public.attendance_records (clock_in DESC);
CREATE INDEX idx_attendance_unsynced ON public.attendance_records (synced_at) WHERE synced_at IS NULL;

-- Prevent double clock-in: at most one open (no clock_out) record per employee per day
CREATE UNIQUE INDEX idx_attendance_one_open_per_employee
  ON public.attendance_records (employee_id, (clock_in::date))
  WHERE clock_out IS NULL;

-- Auto-update trigger
CREATE TRIGGER on_attendance_updated
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper: get employee_id for current auth user (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_employee_id_for_user(user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.employees WHERE profile_id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Acceptance criteria:**
- Table created with all columns
- Indexes for common query patterns
- `get_employee_id_for_user()` helper resolves auth user to employee ID

---

### Step 2: RLS Policies — Attendance Records

Granular row-level security scoped by role.

```sql
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Employees see only their own attendance
CREATE POLICY "Employees see own attendance"
  ON public.attendance_records FOR SELECT
  USING (
    employee_id = public.get_employee_id_for_user(auth.uid())
    AND public.is_user_approved(auth.uid())
  );

-- Supervisors see attendance at their assigned location
CREATE POLICY "Supervisors see location attendance"
  ON public.attendance_records FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'supervisor'
    AND public.is_user_approved(auth.uid())
    AND location_id = public.get_employee_location(auth.uid())
  );

-- Admin/HR see all attendance
CREATE POLICY "Admin/HR see all attendance"
  ON public.attendance_records FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- Employees can insert their own clock-in
CREATE POLICY "Employees can clock in"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    employee_id = public.get_employee_id_for_user(auth.uid())
    AND public.is_user_approved(auth.uid())
    AND clock_in_method = 'self'
  );

-- Supervisors can insert for employees at their location (batch clock-in)
CREATE POLICY "Supervisors can batch clock in"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'supervisor'
    AND public.is_user_approved(auth.uid())
    AND location_id = public.get_employee_location(auth.uid())
    AND clock_in_method = 'supervisor_batch'
  );

-- Admin/HR can insert any record
CREATE POLICY "Admin/HR can insert attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );

-- Employees can update their own record (clock-out only)
CREATE POLICY "Employees can clock out"
  ON public.attendance_records FOR UPDATE
  USING (
    employee_id = public.get_employee_id_for_user(auth.uid())
    AND public.is_user_approved(auth.uid())
  )
  WITH CHECK (
    employee_id = public.get_employee_id_for_user(auth.uid())
  );

-- Supervisors can update records at their location (notes, clock-out)
CREATE POLICY "Supervisors can update location attendance"
  ON public.attendance_records FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) = 'supervisor'
    AND public.is_user_approved(auth.uid())
    AND location_id = public.get_employee_location(auth.uid())
  );

-- Admin/HR can update any record
CREATE POLICY "Admin/HR can update attendance"
  ON public.attendance_records FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr_officer')
    AND public.is_user_approved(auth.uid())
  );
```

**Acceptance criteria:**
- Employees only see/write their own records
- Supervisors scoped to their assigned location
- Admin/HR have full access
- Clock-in method constrained by role (self vs supervisor_batch)

---

### Step 3: TypeScript Types & Zod Validations

**Files:**
- `src/lib/validations/attendance.ts`

```typescript
// Types
export interface AttendanceRecord {
  id: string;
  employee_id: string;
  location_id: string;
  shift_id: string | null;
  clock_in: string;
  clock_out: string | null;
  clock_in_lat: number;
  clock_in_lng: number;
  clock_in_accuracy: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_out_accuracy: number | null;
  clock_in_within_geofence: boolean;
  clock_out_within_geofence: boolean | null;
  clock_in_method: 'self' | 'supervisor_batch' | 'manual_correction';
  clock_out_method: 'self' | 'supervisor_batch' | 'manual_correction' | 'auto_shift_end' | null;
  status: 'present' | 'late' | 'early_departure' | 'absent' | 'on_leave';
  total_minutes: number | null;
  is_overtime: boolean;
  overtime_minutes: number;
  notes: string | null;
  submitted_by: string | null;
  is_corrected: boolean;
  synced_at: string | null;
  client_created_at: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceWithDetails extends AttendanceRecord {
  employees: { full_name: string; employee_number: string } | null;
  locations: { name: string; city: string } | null;
}

// Zod schemas
export const clockInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
});

export const clockOutSchema = z.object({
  attendance_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
});

export const batchClockInSchema = z.object({
  employee_ids: z.array(z.string().uuid()).min(1, "Select at least one employee"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const attendanceNoteSchema = z.object({
  attendance_id: z.string().uuid(),
  notes: z.string().min(1).max(500),
});
```

**Acceptance criteria:**
- Full type coverage for attendance records
- Zod schemas for all mutation inputs
- Coordinates validated

---

### Step 4: Geofence Utility

Shared utility for client-side and server-side geofence validation.

**File:** `src/lib/geo/geofence.ts`

```typescript
/**
 * Haversine distance in meters between two lat/lng points.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number { ... }

/**
 * Check if coordinates are within a location's geofence.
 */
export function isWithinGeofence(
  workerLat: number, workerLng: number,
  locationLat: number, locationLng: number,
  radiusMeters: number
): boolean { ... }

/**
 * Validate GPS reading for spoofing indicators.
 * Returns warnings (not errors) — records are still saved but flagged.
 */
export function validateGpsReading(
  lat: number, lng: number, accuracy: number | null
): { valid: boolean; warnings: string[] } { ... }
```

**Acceptance criteria:**
- Haversine calculation accurate to ~1m
- Geofence check returns boolean
- GPS validation flags: accuracy exactly 0, accuracy > geofence radius, coordinates at exactly (0,0)

---

### Step 5: Server Actions — Clock In/Out

Core attendance server actions for employees.

**File:** `src/actions/attendance.ts`

**Actions:**

1. **`clockInAction(data: ClockInInput)`**
   - `requireAuth()` — any approved user with linked employee record
   - Validate GPS input with Zod
   - Look up current user's employee record + assigned location
   - Calculate geofence validation (Haversine)
   - Check no existing open clock-in today (prevent double clock-in)
   - Insert `attendance_records` with `clock_in_method: 'self'`, `submitted_by: employee.id`
   - Return success with location name and geofence status

2. **`clockOutAction(data: ClockOutInput)`**
   - `requireAuth()` — must own the attendance record
   - Validate GPS input with Zod
   - Find open attendance record (has `clock_in` but no `clock_out`)
   - Calculate geofence validation for clock-out coordinates
   - Calculate `total_minutes` = difference between clock_in and clock_out
   - Update record with clock-out data
   - Return success with total hours worked

3. **`getMyAttendanceAction(filters?: { from?: string; to?: string })`**
   - Fetch current employee's attendance history
   - Default: last 30 days
   - Ordered by clock_in DESC
   - Include location name via join

4. **`getTodayStatusAction()`**
   - Quick check: is the current user clocked in today?
   - Returns: `{ status: 'not_clocked_in' | 'clocked_in' | 'clocked_out', record?: AttendanceRecord }`

**Acceptance criteria:**
- Employee can clock in with GPS → record created
- Employee can clock out → record updated with clock-out data and total_minutes
- Double clock-in prevented (one open record per employee per day)
- Geofence validation runs and result stored (but doesn't block — flag only)
- Attendance history queryable with date range

---

### Step 6: Server Actions — Supervisor

Supervisor-specific attendance actions.

**File:** `src/actions/supervisor.ts`

**Actions:**

1. **`batchClockInAction(data: BatchClockInInput)`**
   - `requireRole('supervisor', 'admin', 'hr_officer')`
   - Validate all employee IDs exist and belong to supervisor's location
   - Use supervisor's GPS coordinates for all records
   - Insert N records with `clock_in_method: 'supervisor_batch'`
   - `submitted_by` = supervisor's employee_id
   - Return count of successful clock-ins

2. **`batchClockOutAction(data: { employee_ids: string[] })`**
   - `requireRole('supervisor', 'admin', 'hr_officer')`
   - Find open attendance records for selected employees
   - Set clock-out to now, calculate total_minutes
   - Use supervisor's last known coordinates (or null)

3. **`getSiteAttendanceAction()`**
   - Fetch today's attendance for supervisor's assigned location
   - Return: list of employees with attendance status (present/absent/not_yet)
   - Include employee name, number, clock-in time, method

4. **`addAttendanceNoteAction(data: AttendanceNoteInput)`**
   - `requireRole('supervisor', 'admin', 'hr_officer')`
   - Update attendance record's notes field
   - Validate record belongs to supervisor's location

5. **`flagAnomalyAction(attendanceId: string, reason: string)`**
   - `requireRole('supervisor', 'admin', 'hr_officer')`
   - Add anomaly flag to notes (prepend "[ANOMALY] reason" to notes)

**Acceptance criteria:**
- Supervisor can select multiple employees and bulk clock them in
- Supervisor sees real-time list of who's checked in at their site
- Supervisor can add notes and flag anomalies
- All actions scoped to supervisor's assigned location

---

### Step 7: Employee Clock-In UI

The hero feature: one-tap check-in optimized for mobile.

**Files:**
- `src/app/(dashboard)/dashboard/attendance/page.tsx` — Attendance page (role-aware routing)
- `src/components/attendance/clock-in-button.tsx` — Large clock-in/out button
- `src/components/attendance/attendance-status.tsx` — Current status display
- `src/components/attendance/gps-status.tsx` — GPS acquisition indicator
- `src/components/attendance/attendance-history.tsx` — Personal history table

**Clock-In UI flow:**
1. Page loads → call `getTodayStatusAction()` to determine state
2. If not clocked in: Show large "Clock In" button (DESIGN.md: emerald, centered, prominent)
3. User taps → Request GPS via `navigator.geolocation.getCurrentPosition()`
4. Show GPS acquisition spinner ("Getting your location...")
5. GPS acquired → Call `clockInAction()` with coordinates
6. Success → Pulse animation, show "Clocked in at {location} at {time}"
7. If clocked in: Show "Clock Out" button (different color) + current duration timer
8. Clock out flow mirrors clock-in

**GPS handling:**
- Use `{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }` for best GPS
- Show accuracy indicator (green < 50m, amber 50-200m, red > 200m)
- If GPS denied or times out: show clear error message, cannot proceed
- If outside geofence: still allow clock-in but show warning banner

**Mobile optimization (per DESIGN.md):**
- Large touch target: button at least 64px tall
- Bottom-anchored on mobile (within thumb reach)
- Minimal UI — time, location name, status badge, action button
- No unnecessary navigation during clock-in flow

**Acceptance criteria:**
- One tap to start clock-in (GPS acquired automatically)
- Visual confirmation with location name and timestamp
- Clock-out shows total hours worked
- GPS status clearly communicated
- Geofence warning if outside radius (non-blocking)
- Works on Chrome Android and Safari iOS
- Responsive: mobile single-column, tablet/desktop centered card

---

### Step 8: Employee Attendance History View

Personal attendance log for employees.

**File:** `src/components/attendance/attendance-history.tsx` (extend from Step 7)

**UI:**
- Table/card list showing past attendance records
- Columns: Date, Clock In, Clock Out, Duration, Location, Status, Method
- Status badges per DESIGN.md colors (present=emerald, late=amber, absent=red)
- Date range filter (default: current month)
- Summary stats at top: days present, total hours, average hours/day

**Acceptance criteria:**
- Employee sees their complete attendance history
- ATT-07 satisfied: "Employee can view their own attendance history"
- Status badges color-coded
- Date range filtering works

---

### Step 9: Supervisor Live Dashboard

Real-time view of who's on-site.

**Files:**
- `src/components/attendance/supervisor-attendance.tsx` — Supervisor's attendance view
- `src/components/attendance/site-employee-list.tsx` — Employee list with attendance status
- `src/components/attendance/batch-clock-in-dialog.tsx` — Batch clock-in modal

**Supervisor dashboard shows:**
1. **Site summary card:** Location name, today's headcount (present / total expected), attendance percentage
2. **Employee list:** All employees assigned to supervisor's location
   - Status indicator: Checked In (green dot + time), Not Yet (gray), Checked Out (blue + duration)
   - Sortable by status, name, time
3. **Batch clock-in button:** Opens dialog to select employees → confirm → GPS captured once → N records created
4. **Notes/flag actions:** Inline on each employee row — add note, flag anomaly

**Batch clock-in dialog:**
- Checkbox list of employees NOT yet clocked in today
- "Select All" option
- GPS captured on submit (supervisor's location)
- Confirm dialog: "Clock in {N} employees at {location}?"
- Success toast with count

**Acceptance criteria:**
- SUP-01: Supervisor sees live attendance of their site's employees
- SUP-02: Supervisor can bulk clock-in selected employees
- SUP-03: Supervisor can add notes to attendance records
- SUP-04: Supervisor can flag attendance anomalies
- Employee list updates after batch operations (revalidate)

---

### Step 10: Dashboard Integration

Wire attendance into the existing role-based dashboard pages.

**Files to modify:**
- `src/components/dashboard/employee-dashboard.tsx` — Add attendance quick-action
- `src/components/dashboard/supervisor-dashboard.tsx` — Add site attendance summary
- `src/components/dashboard/admin-dashboard.tsx` — Add attendance overview stats
- `src/components/dashboard/hr-dashboard.tsx` — Add attendance overview stats

**Employee dashboard additions:**
- Today's status card (Clocked In / Not Clocked In)
- Quick "Clock In" / "Clock Out" button
- Recent attendance list (last 5 entries)

**Supervisor dashboard additions:**
- Site attendance card: {present} / {total} employees on-site
- Quick link to supervisor attendance page
- Flagged items count (if any)

**Admin/HR dashboard additions:**
- Company-wide attendance rate for today
- Per-site breakdown: mini-cards showing each location's headcount
- Quick stats: total present, total absent, total late (late = placeholder until Phase 4)

**Acceptance criteria:**
- Each role sees relevant attendance info on dashboard
- Quick actions accessible without extra navigation
- Stats accurate and real-time

---

### Step 11: Navigation Updates

Add attendance routes to the app navigation.

**Files to modify:**
- `src/components/layout/sidebar.tsx` (or equivalent nav component)

**New nav items:**
- **Attendance** (visible to all roles) → `/dashboard/attendance`
  - Employee: goes to clock-in page
  - Supervisor: goes to site attendance view
  - Admin/HR: goes to attendance overview

**Acceptance criteria:**
- Attendance accessible from sidebar for all roles
- Active state shows on current route

## Verification Checklist

- [ ] `npm run dev` starts clean, no TypeScript errors
- [ ] Employee can clock in → GPS captured → record stored in database
- [ ] Employee can clock out → total_minutes calculated and stored
- [ ] Geofence validation runs → `clock_in_within_geofence` set correctly
- [ ] Double clock-in prevented (error if already clocked in today)
- [ ] GPS denied → clear error, cannot clock in
- [ ] Outside geofence → warning shown, clock-in still allowed
- [ ] Employee sees own attendance history with date range filter
- [ ] Supervisor sees site employee list with attendance status
- [ ] Supervisor can batch clock-in 3+ employees → 3 records created
- [ ] Supervisor can add notes to an attendance record
- [ ] Supervisor can flag an anomaly
- [ ] Admin/HR dashboard shows company-wide attendance stats
- [ ] Employee dashboard shows today's status + quick clock-in
- [ ] RLS enforced: employee cannot see other employees' records
- [ ] RLS enforced: supervisor only sees their location's records
- [ ] Mobile responsive: clock-in button usable one-handed
- [ ] `npx tsc --noEmit` passes

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| GPS permission denied by user | Clear error message explaining why GPS is needed. Cannot proceed without it — attendance requires location proof. |
| GPS inaccurate indoors (factories) | Store accuracy value. Geofence set to 200m default (generous). Show warning at >200m accuracy but don't block. |
| Double clock-in race condition | Use unique partial index: `CREATE UNIQUE INDEX ... WHERE clock_out IS NULL` — DB enforces at most one open record per employee per day. Implement in Step 1. |
| Supervisor batch for wrong location | Server action validates all employee_ids belong to supervisor's location. RLS also enforces location match. |
| RLS performance with helper functions | `get_employee_id_for_user()` and `get_employee_location()` are SECURITY DEFINER STABLE — Postgres caches per-statement. Monitor if queries slow down. |
| Mobile browser geolocation quirks | Use `enableHighAccuracy: true`, timeout 15s, maximumAge 0. Fall back to IP-based location as last resort (with clear warning). |

## Execution Waves

| Wave | Steps | Agents | Notes |
|------|-------|--------|-------|
| 1 | Step 1 (table) + Step 2 (RLS) | backend | Single migration, sequential SQL |
| 2 | Step 3 (types) + Step 4 (geo utility) | backend | Independent, can parallelize |
| 3 | Step 5 (employee actions) + Step 6 (supervisor actions) | backend x2 | Both depend on types + table. Can parallelize. |
| 4 | Step 7 (clock-in UI) + Step 9 (supervisor dashboard) | frontend x2 | Both depend on server actions. Can parallelize. |
| 5 | Step 8 (history) + Step 10 (dashboard integration) + Step 11 (nav) | frontend x2 + backend | Refinements, can parallelize |

## Requirement Coverage

| Req | Description | Delivering Steps | Coverage |
|-----|-------------|-----------------|----------|
| ATT-01 | One-tap clock-in from mobile | Steps 5, 7 | Full |
| ATT-02 | GPS capture + geofence validation | Steps 4, 5, 7 | Full |
| ATT-03 | Offline clock-in (stored locally, synced later) | Schema prepared (synced_at, client_created_at) | **Deferred to Phase 5** — schema ready, logic in Phase 5 |
| ATT-04 | One-tap clock-out (same GPS behavior) | Steps 5, 7 | Full |
| ATT-05 | Records timestamp, GPS, online/offline status | Steps 1, 5 | Full (online only; offline flag ready for Phase 5) |
| ATT-06 | Visual confirmation with location name | Step 7 | Full |
| ATT-07 | Employee attendance history view | Step 8 | Full |
| SUP-01 | Supervisor live site attendance | Step 9 | Full |
| SUP-02 | Supervisor bulk clock-in | Steps 6, 9 | Full |
| SUP-03 | Supervisor notes on records | Steps 6, 9 | Full |
| SUP-04 | Supervisor anomaly flagging | Steps 6, 9 | Full |

**ATT-03 note:** The ROADMAP assigns ATT-03 to Phase 3 but it requires offline/PWA infrastructure (IndexedDB, service worker, sync queue). The schema is designed to support it — `synced_at` NULL means offline origin, `client_created_at` for conflict resolution. Full offline implementation is Phase 5 (PWA). This is documented and intentional.

---
*Plan created: 2026-03-31*

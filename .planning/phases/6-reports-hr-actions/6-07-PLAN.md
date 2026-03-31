---
phase: 6-reports-hr-actions
plan: 07
type: execute
wave: 4
depends_on: ["6-05", "6-06"]
files_modified:
  - src/components/layout/sidebar.tsx
  - src/components/layout/mobile-nav.tsx
  - src/components/dashboard/hr-dashboard.tsx
  - src/app/(dashboard)/dashboard/page.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Sidebar shows 'HR Actions' link for admin and hr_officer roles"
    - "HR dashboard shows attendance trend chart instead of placeholder"
    - "HR dashboard shows recent HR activity feed instead of placeholder"
    - "Build succeeds with no TypeScript errors"
    - "All navigation items work and link to correct pages"
  artifacts:
    - path: "src/components/layout/sidebar.tsx"
      provides: "Updated sidebar with HR Actions nav item"
      contains: "HR Actions"
    - path: "src/components/dashboard/hr-dashboard.tsx"
      provides: "Enhanced HR dashboard with trend chart and recent activity"
      min_lines: 100
  key_links:
    - from: "src/components/layout/sidebar.tsx"
      to: "src/app/(dashboard)/dashboard/hr-actions/page.tsx"
      via: "nav link to /dashboard/hr-actions"
      pattern: "/dashboard/hr-actions"
    - from: "src/components/dashboard/hr-dashboard.tsx"
      to: "src/actions/reports.ts"
      via: "receives trend data as prop"
      pattern: "TrendDataPoint"
    - from: "src/app/(dashboard)/dashboard/page.tsx"
      to: "src/actions/reports.ts"
      via: "server component fetches trend data for HR dashboard"
      pattern: "getAttendanceTrend"
---

<objective>
Integrate Phase 6 into the existing app: add HR Actions to navigation, fill the HR dashboard placeholder sections (attendance trend chart + recent activity), and ensure the build passes cleanly.

Purpose: Connect all Phase 6 work into the existing app shell so everything is discoverable and functional from the main UI. The HR dashboard should no longer have placeholder sections.
Output: Updated sidebar, mobile nav, HR dashboard, and main dashboard page — all verified with a clean build.
</objective>

<execution_context>
@/home/moayadalqam/.claude/qualia-engine/workflows/execute-plan.md
@/home/moayadalqam/.claude/qualia-engine/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/DESIGN.md
@src/components/layout/sidebar.tsx
@src/components/layout/mobile-nav.tsx
@src/components/dashboard/hr-dashboard.tsx
@src/app/(dashboard)/dashboard/page.tsx
@src/actions/reports.ts
@src/actions/hr-actions.ts
@src/lib/validations/reports.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update navigation with HR Actions link</name>
  <files>
    src/components/layout/sidebar.tsx
    src/components/layout/mobile-nav.tsx
  </files>
  <action>
Update the sidebar to add "HR Actions" as a nav item for admin and hr_officer roles. The link should appear after "Reports" in the nav order.

In `/home/moayadalqam/projects/kunoz/src/components/layout/sidebar.tsx`, add to the `navItems` array:

```ts
// Add after the Reports nav item and before Employees
{
  label: "HR Actions",
  href: "/dashboard/hr-actions",
  icon: ClipboardEdit,  // import from lucide-react
  roles: ["hr_officer", "admin"],
},
```

Import `ClipboardEdit` from `lucide-react` (add to the existing import statement).

In `/home/moayadalqam/projects/kunoz/src/components/layout/mobile-nav.tsx`, add the same nav item to the mobile bottom navigation items array:

```ts
{
  label: "HR Actions",
  href: "/dashboard/hr-actions",
  icon: ClipboardEdit,
  roles: ["hr_officer", "admin"],
},
```

The nav item order should be: Dashboard, My Attendance, Site Attendance, Bulk Check-in, Reports, HR Actions, Employees, Locations, Shifts, User Management.

Note: If `ClipboardEdit` is not available in the installed lucide-react version, use `FilePenLine` or `FileEdit` instead.
  </action>
  <verify>
```bash
grep -n "HR Actions" /home/moayadalqam/projects/kunoz/src/components/layout/sidebar.tsx
```
Expected output: a line number showing the "HR Actions" nav item.

```bash
grep -n "hr-actions" /home/moayadalqam/projects/kunoz/src/components/layout/sidebar.tsx
```
Expected output: a line showing `/dashboard/hr-actions` in the href.

```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -5
```
Expected output: no TypeScript errors.
  </verify>
  <done>Sidebar and mobile nav include "HR Actions" link visible for admin and hr_officer roles, linking to /dashboard/hr-actions</done>
</task>

<task type="auto">
  <name>Task 2: Enhance HR dashboard with trend chart and recent activity</name>
  <files>
    src/components/dashboard/hr-dashboard.tsx
    src/app/(dashboard)/dashboard/page.tsx
  </files>
  <action>
Replace the two placeholder sections in the HR dashboard with real content.

**1. Update HR Dashboard** at `/home/moayadalqam/projects/kunoz/src/components/dashboard/hr-dashboard.tsx`:

Replace the "Attendance Trends" placeholder with the `AttendanceTrendChart` component. Replace the "Recent Activity" placeholder with a real recent-activity feed showing the latest HR actions and attendance events.

The updated component should:
- Accept two new props: `trendData: TrendDataPoint[]` and `recentLogs: HrActionLog[]`
- Import `AttendanceTrendChart` from `@/components/reports/attendance-trend-chart`
- Import `Badge` for status styling in the recent activity feed
- Keep the existing StatCard grid at the top unchanged
- Replace the "Attendance Trends" placeholder Card with `<AttendanceTrendChart data={trendData} />`
- Replace the "Recent Activity" placeholder with a Card showing the last 5 HR action log entries (action type badge, performer name, reason, time)

```tsx
// New imports to add:
import type { TrendDataPoint } from "@/lib/validations/reports";
import type { HrActionLog } from "@/lib/validations/hr-actions";
import { hrActionTypeLabels } from "@/lib/validations/hr-actions";
import { AttendanceTrendChart } from "@/components/reports/attendance-trend-chart";
import { Badge } from "@/components/ui/badge";

// Update interface:
interface HrDashboardProps {
  profile: Profile;
  attendanceStats: AttendanceStats;
  trendData: TrendDataPoint[];
  recentLogs: HrActionLog[];
}
```

For the recent activity section, render a list:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Recent HR Activity</CardTitle>
  </CardHeader>
  <CardContent>
    {recentLogs.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">
        No recent HR actions
      </p>
    ) : (
      <div className="space-y-3">
        {recentLogs.slice(0, 5).map((log) => (
          <div key={log.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-[10px]">
                {hrActionTypeLabels[log.action_type] ?? log.action_type}
              </Badge>
              <div>
                <p className="text-sm">{log.reason.slice(0, 60)}{log.reason.length > 60 ? "..." : ""}</p>
                <p className="text-xs text-muted-foreground">by {log.performer_name}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(log.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

**2. Update main dashboard page** at `/home/moayadalqam/projects/kunoz/src/app/(dashboard)/dashboard/page.tsx`:

For the `hr_officer` and `admin` cases, add the new data fetches:

```tsx
// Add import at top:
import { getAttendanceTrend } from "@/actions/reports";
import { getAuditLogAction } from "@/actions/hr-actions";

// In the admin case:
case "admin": {
  const [stats, trend, logs] = await Promise.all([
    getAttendanceStatsAction(),
    getAttendanceTrend(7),
    getAuditLogAction(5),
  ]);
  return (
    <AdminDashboard
      profile={profile}
      pendingCount={pendingCount}
      attendanceStats={stats}
    />
  );
}

// In the hr_officer case:
case "hr_officer": {
  const [stats, trend, logs] = await Promise.all([
    getAttendanceStatsAction(),
    getAttendanceTrend(7),
    getAuditLogAction(5),
  ]);
  return (
    <HrDashboard
      profile={profile}
      attendanceStats={stats}
      trendData={trend}
      recentLogs={logs}
    />
  );
}
```

For the admin case, the AdminDashboard component interface may not accept trendData/recentLogs yet — that's fine, the admin dashboard can remain as-is for now. The HR dashboard is the primary target.

If the AdminDashboard also has placeholders, consider passing the same props. But the minimum requirement is that HrDashboard receives and renders the new data.
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -10
```
Expected output: no TypeScript errors.

```bash
grep "AttendanceTrendChart" /home/moayadalqam/projects/kunoz/src/components/dashboard/hr-dashboard.tsx
```
Expected output: at least one line showing the import or usage of AttendanceTrendChart.

```bash
grep "trendData" /home/moayadalqam/projects/kunoz/src/components/dashboard/hr-dashboard.tsx
```
Expected output: at least one line showing trendData in the props interface or component body.

```bash
grep "getAttendanceTrend\|getAuditLogAction" /home/moayadalqam/projects/kunoz/src/app/\(dashboard\)/dashboard/page.tsx
```
Expected output: lines showing both imports are used in the dashboard page.
  </verify>
  <done>HR dashboard shows real attendance trend chart and recent HR activity feed instead of placeholder sections. Dashboard page fetches trend and audit log data for HR views.</done>
</task>

<task type="auto">
  <name>Task 3: Final build verification and cleanup</name>
  <files>
    (no new files — verification only)
  </files>
  <action>
Run a full build to verify everything compiles and the app is production-ready.

```bash
cd /home/moayadalqam/projects/kunoz && npm run build
```

If there are TypeScript errors, fix them. Common issues to watch for:

1. **Import paths**: Ensure all new components use `@/` path aliases correctly
2. **Type mismatches**: Ensure report action return types match the interface definitions in validations/reports.ts
3. **Missing exports**: Ensure all components referenced in page files are properly exported
4. **Recharts SSR**: If recharts causes SSR issues, ensure chart components are marked `"use client"` (they should be already)
5. **xlsx in client**: The xlsx library is client-side only — ensure it's only imported in files marked `"use client"` or in the `src/lib/reports/export-xlsx.ts` utility (which is imported by client components)

If the build succeeds, verify the page routes exist:
```bash
ls /home/moayadalqam/projects/kunoz/src/app/\(dashboard\)/dashboard/reports/page.tsx
ls /home/moayadalqam/projects/kunoz/src/app/\(dashboard\)/dashboard/hr-actions/page.tsx
```

Verify component count:
```bash
ls /home/moayadalqam/projects/kunoz/src/components/reports/ | wc -l
```
Should be 12+ files.
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npm run build 2>&1 | tail -10
```
Expected output: build succeeds showing "Route (app)" entries including `/dashboard/reports` and `/dashboard/hr-actions`.

```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | wc -l
```
Expected output: `0` (no errors).
  </verify>
  <done>Full Next.js build passes with zero errors. All Phase 6 routes (/dashboard/reports, /dashboard/hr-actions) are compiled. All components render without type errors.</done>
</task>

</tasks>

<verification>
- `npm run build` passes
- `npx tsc --noEmit` returns zero errors
- Sidebar shows HR Actions link for admin/hr_officer
- HR dashboard renders trend chart and recent activity
- Reports page accessible at /dashboard/reports
- HR Actions page accessible at /dashboard/hr-actions
</verification>

<success_criteria>
- Clean production build (npm run build succeeds)
- Zero TypeScript errors (npx tsc --noEmit clean)
- HR Actions appears in sidebar navigation
- HR dashboard chart shows real trend data (not placeholder)
- HR dashboard activity feed shows real audit log entries (not placeholder)
- All 8 report types accessible via the Reports page tabs
- All 5 HR actions accessible via the HR Actions page
</success_criteria>

<output>
After completion, create `.planning/phases/6-reports-hr-actions/6-07-SUMMARY.md`
</output>

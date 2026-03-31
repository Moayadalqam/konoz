---
phase: 6-reports-hr-actions
plan: 03
type: execute
wave: 2
depends_on: ["6-01", "6-02"]
files_modified:
  - src/actions/reports.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Server actions return real data from Supabase for all report types"
    - "Daily attendance report groups by location with correct status counts"
    - "Employee summary computes total hours, overtime, and absence metrics"
    - "Late arrivals report includes frequency analysis per employee"
    - "Overtime and absence reports compute patterns and alerts"
    - "Site comparison returns attendance rates for all locations"
    - "Trend data returns daily aggregates for chart rendering"
  artifacts:
    - path: "src/actions/reports.ts"
      provides: "All report data-fetching server actions"
      exports: ["getDailyAttendanceReport", "getEmployeeSummaryReport", "getLateArrivalsReport", "getOvertimeReport", "getAbsenceReport", "getSiteComparisonReport", "getAttendanceTrend"]
      min_lines: 250
  key_links:
    - from: "src/actions/reports.ts"
      to: "src/lib/supabase/admin.ts"
      via: "uses admin client for cross-user queries"
      pattern: "createAdminClient"
    - from: "src/actions/reports.ts"
      to: "src/lib/validations/reports.ts"
      via: "returns typed report data"
      pattern: "import.*from.*validations/reports"
    - from: "src/actions/reports.ts"
      to: "src/lib/auth/dal.ts"
      via: "requireRole for authorization"
      pattern: "requireRole.*admin.*hr_officer"
---

<objective>
Create all report server actions (RPT-01 through RPT-08) that query Supabase and return typed report data.

Purpose: These server actions are the data layer for all report UI components and Excel export. Each action takes filter parameters and returns structured data matching the types defined in Plan 01.
Output: Single server action file with 7 exported functions covering all report requirements.
</objective>

<execution_context>
@/home/moayadalqam/.claude/qualia-engine/workflows/execute-plan.md
@/home/moayadalqam/.claude/qualia-engine/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@src/lib/validations/reports.ts
@src/lib/validations/attendance.ts
@src/lib/validations/employee.ts
@src/lib/validations/location.ts
@src/lib/auth/dal.ts
@src/lib/supabase/admin.ts
@src/actions/attendance-stats.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create all report server actions</name>
  <files>src/actions/reports.ts</files>
  <action>
Create `/home/moayadalqam/projects/kunoz/src/actions/reports.ts` with all report actions.

Key implementation requirements:

1. All actions use `"use server"` directive
2. All actions start with `await requireRole("admin", "hr_officer")`
3. All actions use `createAdminClient()` for cross-user data access (service_role bypasses RLS)
4. All actions validate input with `reportFiltersSchema.safeParse()`
5. Jordan work week is Sun-Thu; Fridays (day 5) are skipped in working day calculations
6. Absence detection: compare working days against days with attendance records

The file must export these 7 functions:

**getDailyAttendanceReport(filters: ReportFilters): Promise<DailyAttendanceReport>**
- Fetches all active employees (optionally filtered by location)
- Fetches attendance records for the date range
- Builds a row per employee: if no record exists, status is "absent"
- Returns rows + summary counts (present, late, absent, onLeave, earlyDeparture)

**getEmployeeSummaryReport(filters: ReportFilters): Promise<EmployeeSummaryRow[]>**
- Groups attendance records by employee over the date range
- Calculates: totalDays (records), presentDays, lateDays, absentDays (working days - record days), onLeaveDays, earlyDepartureDays
- Calculates: totalHours, overtimeHours, averageHoursPerDay

**getLateArrivalsReport(filters: ReportFilters): Promise<{ rows: LateArrivalRow[]; frequencies: LateFrequency[] }>**
- Queries records with status='late', joined with employees and shifts
- Calculates minutesLate from clockIn vs shift start_time
- Frequency analysis: groups by employee, computes lateCount, latePercentage, averageMinutesLate
- Sorts frequencies by lateCount descending

**getOvertimeReport(filters: ReportFilters): Promise<{ rows: OvertimeRow[]; summaries: OvertimeSummary[] }>**
- Queries records with is_overtime=true, includes overtime_status
- Summarizes by employee: totalOvertimeMinutes, occurrences, approvedMinutes, pendingMinutes, rejectedMinutes

**getAbsenceReport(filters: ReportFilters): Promise<{ rows: AbsenceRow[]; patterns: AbsencePattern[] }>**
- Generates list of working days in range (skip Fridays)
- For each employee, finds days with no attendance record = absent
- Detects consecutive absences (allows 2-day gap for Friday weekend)
- Patterns: absence rate, maxConsecutiveAbsences, isAlert (rate>15% or consecutive>3)

**getSiteComparisonReport(filters: Pick<ReportFilters, "from" | "to">): Promise<SiteComparisonRow[]>**
- For each active location: calculates attendanceRate, lateRate, absenceRate, averageHoursPerDay, totalOvertimeHours
- totalPossible = totalEmployees * workingDays

**getAttendanceTrend(days: number = 7): Promise<TrendDataPoint[]>**
- Returns daily aggregates for the last N days (skipping Fridays)
- Each point: date, present count, late count, absent count, onLeave count

All helper functions (getDateBounds, getWorkingDayCount) should be module-private (not exported).

```ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/dal";
import {
  reportFiltersSchema,
  type ReportFilters,
  type DailyAttendanceReport,
  type DailyAttendanceRow,
  type EmployeeSummaryRow,
  type LateArrivalRow,
  type LateFrequency,
  type OvertimeRow,
  type OvertimeSummary,
  type AbsenceRow,
  type AbsencePattern,
  type SiteComparisonRow,
  type TrendDataPoint,
} from "@/lib/validations/reports";

function getDateBounds(from: string, to: string) {
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T23:59:59.999");
  return { fromISO: fromDate.toISOString(), toISO: toDate.toISOString() };
}

function getWorkingDayCount(from: string, to: string): number {
  let count = 0;
  const current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    if (current.getDay() !== 5) count++; // Skip Friday
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ... implement all 7 functions as described above
```

The full implementation for each function follows the patterns from `src/actions/attendance-stats.ts` (uses createAdminClient, processes data in JS after fetching). Each function should be 30-60 lines. Total file: 300-400 lines.
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -10
```
Expected output: no TypeScript errors.

```bash
grep -c "export async function" /home/moayadalqam/projects/kunoz/src/actions/reports.ts
```
Expected output: `7` (all seven report functions exported).
  </verify>
  <done>All 7 report server actions compile, accept ReportFilters, and return correctly typed data matching the interfaces in validations/reports.ts</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- All 7 report actions are exported and callable
- Each action uses requireRole and createAdminClient for proper authorization
</verification>

<success_criteria>
- getDailyAttendanceReport returns DailyAttendanceReport with per-employee status
- getEmployeeSummaryReport returns EmployeeSummaryRow[] with hours/overtime/absence calculations
- getLateArrivalsReport returns rows + frequency analysis sorted by count
- getOvertimeReport returns rows + summaries with approved/pending/rejected breakdown
- getAbsenceReport returns rows with consecutive detection + patterns with alerts
- getSiteComparisonReport returns all locations with attendance/late/absence rates
- getAttendanceTrend returns daily aggregates for chart rendering
</success_criteria>

<output>
After completion, create `.planning/phases/6-reports-hr-actions/6-03-SUMMARY.md`
</output>

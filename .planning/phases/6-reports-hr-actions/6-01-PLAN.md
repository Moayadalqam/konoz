---
phase: 6-reports-hr-actions
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/validations/reports.ts
  - src/lib/validations/hr-actions.ts
  - package.json
  - package-lock.json
autonomous: true
user_setup: []

must_haves:
  truths:
    - "recharts and xlsx packages are installed and importable"
    - "All TypeScript types for reports and HR actions exist and compile"
    - "Zod validation schemas exist for every HR action form"
  artifacts:
    - path: "src/lib/validations/reports.ts"
      provides: "Report filter types, report data interfaces, export types"
      min_lines: 80
    - path: "src/lib/validations/hr-actions.ts"
      provides: "HR action types, Zod schemas for correction/approval/warning/leave forms"
      min_lines: 100
  key_links:
    - from: "src/lib/validations/reports.ts"
      to: "src/lib/validations/attendance.ts"
      via: "imports AttendanceRecord type"
      pattern: "import.*AttendanceRecord.*attendance"
    - from: "src/lib/validations/hr-actions.ts"
      to: "src/lib/validations/attendance.ts"
      via: "references attendance status enum"
      pattern: "present.*late.*early_departure.*absent.*on_leave"
---

<objective>
Install dependencies (recharts, xlsx) and create all TypeScript types and Zod validation schemas needed for Phase 6.

Purpose: Establish the type foundation so all subsequent plans (report actions, HR actions, UI) can import from a single source of truth without circular dependencies.
Output: Two validation files with complete type coverage for reports and HR actions, plus installed packages.
</objective>

<execution_context>
@/home/moayadalqam/.claude/qualia-engine/workflows/execute-plan.md
@/home/moayadalqam/.claude/qualia-engine/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/DESIGN.md
@src/lib/validations/attendance.ts
@src/lib/validations/employee.ts
@src/lib/validations/location.ts
@src/lib/validations/shift.ts
@src/lib/auth/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install recharts and xlsx packages</name>
  <files>package.json</files>
  <action>
Install the two new dependencies needed for Phase 6:

```bash
cd /home/moayadalqam/projects/kunoz && npm install recharts xlsx
```

recharts is used for all chart components (bar, line, pie charts in reports).
xlsx (SheetJS) is used for client-side Excel export of all report data.

No additional type packages needed — recharts ships its own types, xlsx has bundled types.
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && node -e "require('recharts'); require('xlsx'); console.log('OK')"
```
Expected output: `OK`

```bash
grep '"recharts"' /home/moayadalqam/projects/kunoz/package.json && grep '"xlsx"' /home/moayadalqam/projects/kunoz/package.json
```
Expected output: two lines showing the version entries for recharts and xlsx.
  </verify>
  <done>recharts and xlsx appear in package.json dependencies and are importable</done>
</task>

<task type="auto">
  <name>Task 2: Create report types and filter schemas</name>
  <files>src/lib/validations/reports.ts</files>
  <action>
Create `/home/moayadalqam/projects/kunoz/src/lib/validations/reports.ts` with all types needed by report server actions and UI components.

```ts
import { z } from "zod";

// ── Report Filter Schemas ──

export const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

export type DateRange = z.infer<typeof dateRangeSchema>;

export const reportFiltersSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  locationId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export const periodSchema = z.enum(["daily", "weekly", "monthly"]);
export type Period = z.infer<typeof periodSchema>;

// ── RPT-02: Daily Attendance Report ──

export interface DailyAttendanceRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  clockIn: string | null;
  clockOut: string | null;
  status: "present" | "late" | "early_departure" | "absent" | "on_leave";
  totalMinutes: number | null;
  shiftName: string | null;
  isOvertime: boolean;
  overtimeMinutes: number;
  notes: string | null;
}

export interface DailyAttendanceReport {
  date: string;
  locationId: string | null;
  locationName: string | null;
  rows: DailyAttendanceRow[];
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    earlyDeparture: number;
  };
}

// ── RPT-03: Employee Summary Report ──

export interface EmployeeSummaryRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  onLeaveDays: number;
  earlyDepartureDays: number;
  totalHours: number;
  overtimeHours: number;
  averageHoursPerDay: number;
}

// ── RPT-04: Late Arrivals Report ──

export interface LateArrivalRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  date: string;
  clockIn: string;
  shiftStart: string;
  minutesLate: number;
  shiftName: string | null;
}

export interface LateFrequency {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  lateCount: number;
  totalWorkDays: number;
  latePercentage: number;
  averageMinutesLate: number;
}

// ── RPT-05: Overtime Report ──

export interface OvertimeRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  date: string;
  totalMinutes: number;
  overtimeMinutes: number;
  overtimeStatus: "pending" | "approved" | "rejected";
  shiftName: string | null;
}

export interface OvertimeSummary {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  totalOvertimeMinutes: number;
  overtimeOccurrences: number;
  approvedMinutes: number;
  pendingMinutes: number;
  rejectedMinutes: number;
}

// ── RPT-06: Absence Report ──

export interface AbsenceRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  date: string;
  reason: string | null;
  isConsecutive: boolean;
  consecutiveCount: number;
}

export interface AbsencePattern {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  totalAbsences: number;
  totalWorkDays: number;
  absenceRate: number;
  maxConsecutiveAbsences: number;
  isAlert: boolean; // true if absence rate > 15% or consecutive > 3
}

// ── RPT-08: Site Comparison ──

export interface SiteComparisonRow {
  locationId: string;
  locationName: string;
  city: string;
  totalEmployees: number;
  attendanceRate: number;
  lateRate: number;
  absenceRate: number;
  averageHoursPerDay: number;
  totalOvertimeHours: number;
}

// ── Trend Data (for charts) ──

export interface TrendDataPoint {
  date: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
}

export interface OvertimeTrendPoint {
  date: string;
  totalOvertimeMinutes: number;
  approvedMinutes: number;
}
```
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -5
```
Expected output: no errors (empty output or clean compilation).

```bash
grep -c "export interface\|export type\|export const" /home/moayadalqam/projects/kunoz/src/lib/validations/reports.ts
```
Expected output: a number >= 15 (confirming all types are exported).
  </verify>
  <done>All report types compile, cover RPT-02 through RPT-08 data structures, and include Zod filter schemas</done>
</task>

<task type="auto">
  <name>Task 3: Create HR action types and Zod schemas</name>
  <files>src/lib/validations/hr-actions.ts</files>
  <action>
Create `/home/moayadalqam/projects/kunoz/src/lib/validations/hr-actions.ts` with types for the audit log, corrections, overtime approvals, warnings, and leave marking.

```ts
import { z } from "zod";

// ── HRA-05: Audit Log ──

export const hrActionTypes = [
  "attendance_correction",
  "overtime_approval",
  "overtime_rejection",
  "warning_issued",
  "leave_marked",
  "absence_marked",
] as const;

export type HrActionType = (typeof hrActionTypes)[number];

export interface HrActionLog {
  id: string;
  action_type: HrActionType;
  target_record_id: string;
  target_table: string;
  performed_by: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string;
  created_at: string;
  // Joined fields
  performer_name?: string;
}

// ── HRA-01: Attendance Correction ──

export const attendanceCorrectionSchema = z.object({
  attendance_id: z.string().uuid("Invalid attendance record"),
  clock_in: z.string().datetime({ offset: true }).optional(),
  clock_out: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["present", "late", "early_departure", "absent", "on_leave"]).optional(),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
});

export type AttendanceCorrectionInput = z.infer<typeof attendanceCorrectionSchema>;

// ── HRA-02: Overtime Approval ──

export const overtimeApprovalSchema = z.object({
  attendance_id: z.string().uuid("Invalid attendance record"),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

export type OvertimeApprovalInput = z.infer<typeof overtimeApprovalSchema>;

export type OvertimeStatus = "pending" | "approved" | "rejected";

export interface OvertimeEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  location_name: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  overtime_minutes: number;
  overtime_status: OvertimeStatus;
  overtime_approved_by: string | null;
  shift_name: string | null;
  date: string;
}

// ── HRA-03: Warning Notice ──

export const warningTypes = [
  "excessive_lateness",
  "excessive_absence",
  "unauthorized_absence",
  "early_departure",
  "geofence_violation",
  "other",
] as const;

export type WarningType = (typeof warningTypes)[number];

export const warningSchema = z.object({
  employee_id: z.string().uuid("Invalid employee"),
  warning_type: z.enum(warningTypes),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  attendance_record_ids: z.array(z.string().uuid()).optional().default([]),
});

export type WarningInput = z.infer<typeof warningSchema>;

export interface EmployeeWarning {
  id: string;
  employee_id: string;
  issued_by: string;
  warning_type: WarningType;
  description: string;
  attendance_record_ids: string[];
  created_at: string;
  // Joined fields
  employee_name?: string;
  employee_number?: string;
  issuer_name?: string;
}

// ── HRA-04: Leave/Absence Marking ──

export const leaveReasons = [
  "annual_leave",
  "sick_leave",
  "personal_leave",
  "emergency",
  "official_business",
  "unpaid_leave",
  "other",
] as const;

export type LeaveReason = (typeof leaveReasons)[number];

export const markLeaveSchema = z.object({
  employee_id: z.string().uuid("Invalid employee"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  status: z.enum(["on_leave", "absent"]),
  leave_reason: z.enum(leaveReasons),
  notes: z.string().max(500).optional(),
});

export type MarkLeaveInput = z.infer<typeof markLeaveSchema>;

// ── Label Maps ──

export const warningTypeLabels: Record<WarningType, string> = {
  excessive_lateness: "Excessive Lateness",
  excessive_absence: "Excessive Absence",
  unauthorized_absence: "Unauthorized Absence",
  early_departure: "Early Departure",
  geofence_violation: "Geofence Violation",
  other: "Other",
};

export const leaveReasonLabels: Record<LeaveReason, string> = {
  annual_leave: "Annual Leave",
  sick_leave: "Sick Leave",
  personal_leave: "Personal Leave",
  emergency: "Emergency",
  official_business: "Official Business",
  unpaid_leave: "Unpaid Leave",
  other: "Other",
};

export const overtimeStatusLabels: Record<OvertimeStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const hrActionTypeLabels: Record<HrActionType, string> = {
  attendance_correction: "Attendance Correction",
  overtime_approval: "Overtime Approved",
  overtime_rejection: "Overtime Rejected",
  warning_issued: "Warning Issued",
  leave_marked: "Leave Marked",
  absence_marked: "Absence Marked",
};
```
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -5
```
Expected output: no errors (empty output or clean compilation).

```bash
grep -c "export const\|export interface\|export type" /home/moayadalqam/projects/kunoz/src/lib/validations/hr-actions.ts
```
Expected output: a number >= 20 (confirming all types, schemas, and label maps are exported).
  </verify>
  <done>All HR action types, Zod schemas, and human-readable label maps compile and are exported</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- `recharts` and `xlsx` in package.json
- Both validation files export all needed types for Plans 02-06
</verification>

<success_criteria>
- Zero TypeScript errors project-wide
- recharts and xlsx installed
- reports.ts has types for all 8 report requirements (RPT-01 through RPT-08)
- hr-actions.ts has Zod schemas for correction, overtime approval, warning, and leave marking
- hr-actions.ts has audit log type and all label maps
</success_criteria>

<output>
After completion, create `.planning/phases/6-reports-hr-actions/6-01-SUMMARY.md`
</output>

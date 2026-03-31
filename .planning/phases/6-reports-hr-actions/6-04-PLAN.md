---
phase: 6-reports-hr-actions
plan: 04
type: execute
wave: 2
depends_on: ["6-01", "6-02"]
files_modified:
  - src/actions/hr-actions.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "HR can correct an attendance record and the old values are captured in the audit log"
    - "HR can approve or reject overtime entries and the action is logged"
    - "HR can issue a warning notice linked to specific attendance records"
    - "HR can mark an employee as on-leave or absent for a specific date"
    - "All HR actions create an entry in hr_action_logs with timestamp and performer"
    - "Pending overtime entries are queryable for the approval queue"
  artifacts:
    - path: "src/actions/hr-actions.ts"
      provides: "All HR action server actions with audit logging"
      exports: ["correctAttendanceAction", "approveOvertimeAction", "issueWarningAction", "markLeaveAction", "getOvertimeQueueAction", "getAuditLogAction", "getWarningsAction"]
      min_lines: 200
  key_links:
    - from: "src/actions/hr-actions.ts"
      to: "src/lib/supabase/server.ts"
      via: "uses authenticated client for RLS-enforced writes"
      pattern: "createClient"
    - from: "src/actions/hr-actions.ts"
      to: "src/lib/validations/hr-actions.ts"
      via: "validates input with Zod schemas"
      pattern: "import.*from.*validations/hr-actions"
    - from: "src/actions/hr-actions.ts"
      to: "src/lib/auth/dal.ts"
      via: "requireRole for HR authorization"
      pattern: "requireRole.*admin.*hr_officer"
---

<objective>
Create all HR action server actions (HRA-01 through HRA-05): attendance correction, overtime approval, warning issuance, leave marking, plus query actions for the overtime queue, audit log, and warnings list.

Purpose: These server actions handle the write operations (corrections, approvals, warnings, leave) and their associated reads (queues, logs). Every mutating action writes to hr_action_logs for audit compliance.
Output: Single server action file with 7 exported functions.
</objective>

<execution_context>
@/home/moayadalqam/.claude/qualia-engine/workflows/execute-plan.md
@/home/moayadalqam/.claude/qualia-engine/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@src/lib/validations/hr-actions.ts
@src/lib/validations/attendance.ts
@src/lib/auth/dal.ts
@src/lib/supabase/server.ts
@src/lib/supabase/admin.ts
@src/actions/attendance.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create HR action server actions with audit logging</name>
  <files>src/actions/hr-actions.ts</files>
  <action>
Create `/home/moayadalqam/projects/kunoz/src/actions/hr-actions.ts` with all HR action server actions.

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  attendanceCorrectionSchema,
  overtimeApprovalSchema,
  warningSchema,
  markLeaveSchema,
  type AttendanceCorrectionInput,
  type OvertimeApprovalInput,
  type WarningInput,
  type MarkLeaveInput,
  type HrActionLog,
  type OvertimeEntry,
  type EmployeeWarning,
  type HrActionType,
} from "@/lib/validations/hr-actions";

// ── Helper: Log HR action to audit table ──

async function logHrAction(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  actionType: HrActionType;
  targetRecordId: string;
  targetTable: string;
  performedBy: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  reason: string;
}) {
  const { error } = await params.supabase.from("hr_action_logs").insert({
    action_type: params.actionType,
    target_record_id: params.targetRecordId,
    target_table: params.targetTable,
    performed_by: params.performedBy,
    old_values: params.oldValues,
    new_values: params.newValues,
    reason: params.reason,
  });

  if (error) {
    console.error("Failed to log HR action:", error.message);
    // Don't throw — audit log failure shouldn't block the action
  }
}

// ── HRA-01: Correct Attendance Record ──

export async function correctAttendanceAction(data: AttendanceCorrectionInput) {
  const profile = await requireRole("admin", "hr_officer");

  const parsed = attendanceCorrectionSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();

  // Fetch the original record for audit trail (old_values)
  const { data: original, error: fetchError } = await supabase
    .from("attendance_records")
    .select("clock_in, clock_out, status, total_minutes, is_overtime, overtime_minutes, is_corrected")
    .eq("id", parsed.data.attendance_id)
    .single();

  if (fetchError || !original) throw new Error("Attendance record not found");

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {
    is_corrected: true,
    clock_in_method: "manual_correction",
  };

  if (parsed.data.clock_in) updates.clock_in = parsed.data.clock_in;
  if (parsed.data.clock_out) {
    updates.clock_out = parsed.data.clock_out;
    updates.clock_out_method = "manual_correction";
    // Recalculate total_minutes if both clock_in and clock_out are known
    const cin = parsed.data.clock_in ? new Date(parsed.data.clock_in) : new Date(original.clock_in);
    const cout = new Date(parsed.data.clock_out);
    updates.total_minutes = Math.round((cout.getTime() - cin.getTime()) / 60000);
  }
  if (parsed.data.status) updates.status = parsed.data.status;

  const { error: updateError } = await supabase
    .from("attendance_records")
    .update(updates)
    .eq("id", parsed.data.attendance_id);

  if (updateError) throw new Error(updateError.message);

  // Log to audit trail
  await logHrAction({
    supabase,
    actionType: "attendance_correction",
    targetRecordId: parsed.data.attendance_id,
    targetTable: "attendance_records",
    performedBy: profile.id,
    oldValues: original as Record<string, unknown>,
    newValues: updates,
    reason: parsed.data.reason,
  });

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");

  return { success: true };
}

// ── HRA-02: Approve/Reject Overtime ──

export async function approveOvertimeAction(data: OvertimeApprovalInput) {
  const profile = await requireRole("admin", "hr_officer");

  const parsed = overtimeApprovalSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();

  // Fetch original for audit
  const { data: original, error: fetchError } = await supabase
    .from("attendance_records")
    .select("overtime_status, overtime_approved_by, overtime_minutes, is_overtime")
    .eq("id", parsed.data.attendance_id)
    .single();

  if (fetchError || !original) throw new Error("Attendance record not found");

  if (!original.is_overtime) throw new Error("This record has no overtime to approve");

  const newStatus = parsed.data.action === "approve" ? "approved" : "rejected";

  const { error: updateError } = await supabase
    .from("attendance_records")
    .update({
      overtime_status: newStatus,
      overtime_approved_by: profile.id,
    })
    .eq("id", parsed.data.attendance_id);

  if (updateError) throw new Error(updateError.message);

  // Log to audit trail
  await logHrAction({
    supabase,
    actionType: parsed.data.action === "approve" ? "overtime_approval" : "overtime_rejection",
    targetRecordId: parsed.data.attendance_id,
    targetTable: "attendance_records",
    performedBy: profile.id,
    oldValues: { overtime_status: original.overtime_status },
    newValues: { overtime_status: newStatus },
    reason: parsed.data.reason ?? `Overtime ${parsed.data.action}d`,
  });

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");

  return { success: true, newStatus };
}

// ── HRA-03: Issue Warning Notice ──

export async function issueWarningAction(data: WarningInput) {
  const profile = await requireRole("admin", "hr_officer");

  const parsed = warningSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();

  // Verify employee exists
  const adminClient = createAdminClient();
  const { data: employee, error: empError } = await adminClient
    .from("employees")
    .select("id, full_name")
    .eq("id", parsed.data.employee_id)
    .single();

  if (empError || !employee) throw new Error("Employee not found");

  // Insert warning
  const { data: warning, error: insertError } = await supabase
    .from("employee_warnings")
    .insert({
      employee_id: parsed.data.employee_id,
      issued_by: profile.id,
      warning_type: parsed.data.warning_type,
      description: parsed.data.description,
      attendance_record_ids: parsed.data.attendance_record_ids,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  // Log to audit trail
  await logHrAction({
    supabase,
    actionType: "warning_issued",
    targetRecordId: warning.id,
    targetTable: "employee_warnings",
    performedBy: profile.id,
    oldValues: null,
    newValues: {
      employee_id: parsed.data.employee_id,
      employee_name: employee.full_name,
      warning_type: parsed.data.warning_type,
    },
    reason: parsed.data.description,
  });

  revalidatePath("/dashboard/reports");

  return { success: true, warningId: warning.id };
}

// ── HRA-04: Mark Leave/Absence ──

export async function markLeaveAction(data: MarkLeaveInput) {
  const profile = await requireRole("admin", "hr_officer");

  const parsed = markLeaveSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get employee and their location
  const { data: employee, error: empError } = await adminClient
    .from("employees")
    .select("id, full_name, primary_location_id")
    .eq("id", parsed.data.employee_id)
    .single();

  if (empError || !employee) throw new Error("Employee not found");

  // Check if there's already an attendance record for this date
  const dateStart = new Date(parsed.data.date + "T00:00:00").toISOString();
  const dateEnd = new Date(parsed.data.date + "T23:59:59.999").toISOString();

  const { data: existing } = await adminClient
    .from("attendance_records")
    .select("id")
    .eq("employee_id", parsed.data.employee_id)
    .gte("clock_in", dateStart)
    .lte("clock_in", dateEnd)
    .limit(1);

  if (existing && existing.length > 0) {
    // Update existing record
    const { error: updateError } = await supabase
      .from("attendance_records")
      .update({
        status: parsed.data.status,
        leave_reason: parsed.data.leave_reason,
        notes: parsed.data.notes ?? null,
        is_corrected: true,
      })
      .eq("id", existing[0].id);

    if (updateError) throw new Error(updateError.message);

    await logHrAction({
      supabase,
      actionType: parsed.data.status === "on_leave" ? "leave_marked" : "absence_marked",
      targetRecordId: existing[0].id,
      targetTable: "attendance_records",
      performedBy: profile.id,
      oldValues: { status: "present" },
      newValues: { status: parsed.data.status, leave_reason: parsed.data.leave_reason },
      reason: parsed.data.notes ?? `Marked as ${parsed.data.status}`,
    });
  } else {
    // Create new record for the date
    const clockInTime = new Date(parsed.data.date + "T08:00:00").toISOString();

    // Get the HR officer's employee record for submitted_by
    const { data: hrEmployee } = await adminClient
      .from("employees")
      .select("id")
      .eq("profile_id", profile.id)
      .single();

    const { data: newRecord, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        employee_id: parsed.data.employee_id,
        location_id: employee.primary_location_id,
        clock_in: clockInTime,
        clock_in_lat: 0,
        clock_in_lng: 0,
        clock_in_within_geofence: false,
        clock_in_method: "manual_correction",
        submitted_by: hrEmployee?.id ?? null,
        client_created_at: clockInTime,
        status: parsed.data.status,
        leave_reason: parsed.data.leave_reason,
        notes: parsed.data.notes ?? null,
        is_corrected: true,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);

    await logHrAction({
      supabase,
      actionType: parsed.data.status === "on_leave" ? "leave_marked" : "absence_marked",
      targetRecordId: newRecord!.id,
      targetTable: "attendance_records",
      performedBy: profile.id,
      oldValues: null,
      newValues: { status: parsed.data.status, leave_reason: parsed.data.leave_reason, date: parsed.data.date },
      reason: parsed.data.notes ?? `Marked as ${parsed.data.status}`,
    });
  }

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");

  return { success: true };
}

// ── Query: Overtime Approval Queue ──

export async function getOvertimeQueueAction(): Promise<OvertimeEntry[]> {
  await requireRole("admin", "hr_officer");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("attendance_records")
    .select("id, employee_id, clock_in, clock_out, total_minutes, overtime_minutes, overtime_status, overtime_approved_by, employees(full_name, employee_number, primary_location_id, locations(name)), shifts(name)")
    .eq("is_overtime", true)
    .order("clock_in", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((rec) => {
    const emp = rec.employees as unknown as {
      full_name: string;
      employee_number: string;
      locations: { name: string } | null;
    } | null;
    const shift = rec.shifts as unknown as { name: string } | null;

    return {
      id: rec.id,
      employee_id: rec.employee_id,
      employee_name: emp?.full_name ?? "Unknown",
      employee_number: emp?.employee_number ?? "",
      location_name: emp?.locations?.name ?? "Unknown",
      clock_in: rec.clock_in,
      clock_out: rec.clock_out,
      total_minutes: rec.total_minutes,
      overtime_minutes: rec.overtime_minutes ?? 0,
      overtime_status: (rec.overtime_status ?? "pending") as OvertimeEntry["overtime_status"],
      overtime_approved_by: rec.overtime_approved_by,
      shift_name: shift?.name ?? null,
      date: rec.clock_in.split("T")[0],
    };
  });
}

// ── Query: Audit Log ──

export async function getAuditLogAction(limit: number = 50): Promise<HrActionLog[]> {
  await requireRole("admin", "hr_officer");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hr_action_logs")
    .select("*, profiles:performed_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((log) => {
    const performer = log.profiles as unknown as { full_name: string } | null;
    return {
      id: log.id,
      action_type: log.action_type as HrActionType,
      target_record_id: log.target_record_id,
      target_table: log.target_table,
      performed_by: log.performed_by,
      old_values: log.old_values as Record<string, unknown> | null,
      new_values: log.new_values as Record<string, unknown> | null,
      reason: log.reason,
      created_at: log.created_at,
      performer_name: performer?.full_name ?? "Unknown",
    };
  });
}

// ── Query: Employee Warnings ──

export async function getWarningsAction(employeeId?: string): Promise<EmployeeWarning[]> {
  await requireRole("admin", "hr_officer");
  const supabase = await createClient();

  let query = supabase
    .from("employee_warnings")
    .select("*, employees:employee_id(full_name, employee_number), issuer:issued_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data ?? []).map((w) => {
    const emp = w.employees as unknown as { full_name: string; employee_number: string } | null;
    const issuer = w.issuer as unknown as { full_name: string } | null;
    return {
      id: w.id,
      employee_id: w.employee_id,
      issued_by: w.issued_by,
      warning_type: w.warning_type as EmployeeWarning["warning_type"],
      description: w.description,
      attendance_record_ids: w.attendance_record_ids ?? [],
      created_at: w.created_at,
      employee_name: emp?.full_name ?? "Unknown",
      employee_number: emp?.employee_number ?? "",
      issuer_name: issuer?.full_name ?? "Unknown",
    };
  });
}
```

Key implementation notes:
- Every mutating action (correct, approve, warn, mark-leave) calls `logHrAction()` for audit trail.
- Corrections capture old_values as a snapshot before the update.
- The `correctAttendanceAction` recalculates total_minutes when clock_out changes.
- `markLeaveAction` handles two cases: updating an existing record vs. creating a new one.
- For new leave records, a synthetic clock_in at 08:00 is used (since the employee didn't actually clock in).
- The overtime queue returns all overtime records (not just pending) so the UI can show history.
- Audit log queries use the foreign key join `profiles:performed_by(full_name)` to get performer names.
- Warning queries use `employees:employee_id(full_name)` and `issuer:issued_by(full_name)` for the joined fields.
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -10
```
Expected output: no TypeScript errors.

```bash
grep -c "export async function" /home/moayadalqam/projects/kunoz/src/actions/hr-actions.ts
```
Expected output: `7` (correctAttendanceAction, approveOvertimeAction, issueWarningAction, markLeaveAction, getOvertimeQueueAction, getAuditLogAction, getWarningsAction).
  </verify>
  <done>All 7 HR action server actions compile, include Zod validation, use requireRole for authorization, and write to hr_action_logs for audit trail on every mutation</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes
- All 4 mutating actions (correct, approve, warn, mark-leave) log to hr_action_logs
- All 3 query actions (overtime queue, audit log, warnings) return typed data
- correctAttendanceAction captures old_values before update
</verification>

<success_criteria>
- correctAttendanceAction validates input, updates record, captures old/new values in audit log
- approveOvertimeAction sets overtime_status and overtime_approved_by
- issueWarningAction creates employee_warnings row + audit log entry
- markLeaveAction handles both update-existing and create-new cases
- getOvertimeQueueAction returns OvertimeEntry[] with joined employee/shift data
- getAuditLogAction returns HrActionLog[] with performer names
- getWarningsAction returns EmployeeWarning[] with employee/issuer names
</success_criteria>

<output>
After completion, create `.planning/phases/6-reports-hr-actions/6-04-SUMMARY.md`
</output>

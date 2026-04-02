"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { computeShiftStatus } from "@/lib/shifts/time-rules";
import type { Shift } from "@/lib/validations/shift";
import {
  correctionSchema,
  overtimeDecisionSchema,
  warningSchema,
  leaveMarkSchema,
  type CorrectionInput,
  type OvertimeDecisionInput,
  type WarningInput,
  type LeaveMarkInput,
  type HrActionLog,
  type EmployeeWarning,
  type PendingOvertimeRecord,
} from "@/lib/validations/hr-actions";

// ── Helpers ──

async function requireHrOrAdmin() {
  return requireRole("admin", "hr_officer");
}

async function logHrAction(
  adminClient: ReturnType<typeof createAdminClient>,
  params: {
    action_type: string;
    target_table: string;
    target_record_id: string;
    performed_by: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    reason: string | null;
  }
) {
  const { error } = await adminClient
    .from("hr_action_logs")
    .insert(params);

  if (error) {
    console.error("Failed to log HR action:", error.message);
  }
}

// ── 1. Correct Attendance Record ──

export async function correctAttendanceAction(data: CorrectionInput) {
  const profile = await requireHrOrAdmin();

  const parsed = correctionSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const adminClient = createAdminClient();

  // Read current attendance record
  const { data: record, error: fetchError } = await adminClient
    .from("attendance_records")
    .select("*")
    .eq("id", parsed.data.attendance_id)
    .single();

  if (fetchError || !record) {
    throw new Error("Attendance record not found");
  }

  // Build update object with only changed fields
  const updates: Record<string, unknown> = {};
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  if (parsed.data.clock_in && parsed.data.clock_in !== record.clock_in) {
    oldValues.clock_in = record.clock_in;
    newValues.clock_in = parsed.data.clock_in;
    updates.clock_in = parsed.data.clock_in;
  }

  if (parsed.data.clock_out !== undefined && parsed.data.clock_out !== record.clock_out) {
    oldValues.clock_out = record.clock_out;
    newValues.clock_out = parsed.data.clock_out;
    updates.clock_out = parsed.data.clock_out;
  }

  if (parsed.data.status && parsed.data.status !== record.status) {
    oldValues.status = record.status;
    newValues.status = parsed.data.status;
    updates.status = parsed.data.status;
  }

  // Recompute shift status if clock times changed and shift is assigned
  if ((updates.clock_in || updates.clock_out) && record.shift_id) {
    const { data: shift } = await adminClient
      .from("shifts")
      .select("*")
      .eq("id", record.shift_id)
      .single();

    if (shift) {
      const effectiveClockIn = (updates.clock_in as string) ?? record.clock_in;
      const effectiveClockOut = (updates.clock_out as string) ?? record.clock_out;

      const shiftResult = computeShiftStatus({
        shift: shift as unknown as Shift,
        clockIn: new Date(effectiveClockIn),
        clockOut: effectiveClockOut ? new Date(effectiveClockOut) : null,
      });

      if (shiftResult) {
        if (shiftResult.status !== record.status) {
          oldValues.status = record.status;
          newValues.status = shiftResult.status;
          updates.status = shiftResult.status;
        }
        if (shiftResult.isOvertime !== record.is_overtime) {
          oldValues.is_overtime = record.is_overtime;
          newValues.is_overtime = shiftResult.isOvertime;
          updates.is_overtime = shiftResult.isOvertime;
        }
        if (shiftResult.overtimeMinutes !== record.overtime_minutes) {
          oldValues.overtime_minutes = record.overtime_minutes;
          newValues.overtime_minutes = shiftResult.overtimeMinutes;
          updates.overtime_minutes = shiftResult.overtimeMinutes;
        }
        if (shiftResult.totalMinutes !== null && shiftResult.totalMinutes !== record.total_minutes) {
          oldValues.total_minutes = record.total_minutes;
          newValues.total_minutes = shiftResult.totalMinutes;
          updates.total_minutes = shiftResult.totalMinutes;
        }
      }
    }
  }

  // Mark as corrected
  updates.is_corrected = true;

  if (Object.keys(updates).length === 1 && updates.is_corrected) {
    throw new Error("No changes detected. Provide at least one field to correct.");
  }

  const { error: updateError } = await adminClient
    .from("attendance_records")
    .update(updates)
    .eq("id", parsed.data.attendance_id);

  if (updateError) throw new Error(updateError.message);

  // Log the action
  await logHrAction(adminClient, {
    action_type: "correction",
    target_table: "attendance_records",
    target_record_id: parsed.data.attendance_id,
    performed_by: profile.id,
    old_values: oldValues,
    new_values: newValues,
    reason: parsed.data.reason,
  });

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/hr-actions");

  return { success: true };
}

// ── 2. Decide on Overtime (Approve/Reject) ──

export async function decideOvertimeAction(data: OvertimeDecisionInput) {
  const profile = await requireHrOrAdmin();

  const parsed = overtimeDecisionSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const adminClient = createAdminClient();

  // Read current record and verify it's pending
  const { data: record, error: fetchError } = await adminClient
    .from("attendance_records")
    .select("id, overtime_status, overtime_minutes, is_overtime, employee_id")
    .eq("id", parsed.data.attendance_id)
    .single();

  if (fetchError || !record) {
    throw new Error("Attendance record not found");
  }

  if (record.overtime_status !== "pending") {
    throw new Error(
      `Cannot process: overtime is already ${record.overtime_status}`
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await adminClient
    .from("attendance_records")
    .update({
      overtime_status: parsed.data.decision,
      overtime_approved_by: profile.id,
      overtime_decided_at: now,
    })
    .eq("id", parsed.data.attendance_id);

  if (updateError) throw new Error(updateError.message);

  const actionType =
    parsed.data.decision === "approved"
      ? "overtime_approval"
      : "overtime_rejection";

  await logHrAction(adminClient, {
    action_type: actionType,
    target_table: "attendance_records",
    target_record_id: parsed.data.attendance_id,
    performed_by: profile.id,
    old_values: { overtime_status: "pending" },
    new_values: {
      overtime_status: parsed.data.decision,
      overtime_approved_by: profile.id,
      overtime_decided_at: now,
    },
    reason: parsed.data.reason ?? null,
  });

  revalidatePath("/dashboard/hr-actions");
  revalidatePath("/dashboard/reports");

  return { success: true, decision: parsed.data.decision };
}

// ── 3. Get Pending Overtime Records ──

export async function getPendingOvertimeAction(): Promise<
  PendingOvertimeRecord[]
> {
  await requireHrOrAdmin();

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("attendance_records")
    .select(
      `
      id,
      employee_id,
      clock_in,
      clock_out,
      overtime_minutes,
      overtime_status,
      employees!attendance_records_employee_id_fkey(full_name, employee_number),
      locations(name),
      shifts(name)
    `
    )
    .eq("is_overtime", true)
    .eq("overtime_status", "pending")
    .order("clock_in", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => {
    const employee = row.employees as unknown as {
      full_name: string;
      employee_number: string;
    };
    const location = row.locations as unknown as { name: string } | null;
    const shift = row.shifts as unknown as { name: string } | null;

    const clockInDate = new Date(row.clock_in);
    const date = clockInDate.toISOString().split("T")[0];

    return {
      id: row.id,
      employee_id: row.employee_id,
      employee_name: employee.full_name,
      employee_number: employee.employee_number,
      location_name: location?.name ?? "Unknown",
      shift_name: shift?.name ?? null,
      clock_in: row.clock_in,
      clock_out: row.clock_out,
      overtime_minutes: row.overtime_minutes ?? 0,
      overtime_status: "pending" as const,
      date,
    };
  });
}

// ── 4. Create Employee Warning ──

export async function createWarningAction(data: WarningInput) {
  const profile = await requireHrOrAdmin();

  const parsed = warningSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const adminClient = createAdminClient();

  // Verify the employee exists
  const { data: employee, error: empError } = await adminClient
    .from("employees")
    .select("id, full_name")
    .eq("id", parsed.data.employee_id)
    .single();

  if (empError || !employee) {
    throw new Error("Employee not found");
  }

  const { data: warning, error: insertError } = await adminClient
    .from("employee_warnings")
    .insert({
      employee_id: parsed.data.employee_id,
      issued_by: profile.id,
      warning_type: parsed.data.warning_type,
      description: parsed.data.description,
      related_attendance_ids: parsed.data.related_attendance_ids ?? [],
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  await logHrAction(adminClient, {
    action_type: "warning",
    target_table: "employees",
    target_record_id: parsed.data.employee_id,
    performed_by: profile.id,
    old_values: null,
    new_values: {
      warning_id: warning?.id,
      warning_type: parsed.data.warning_type,
      description: parsed.data.description,
      related_attendance_ids: parsed.data.related_attendance_ids,
    },
    reason: parsed.data.description,
  });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/hr-actions");

  return { success: true, warning_id: warning?.id };
}

// ── 5. Get Employee Warnings ──

export async function getEmployeeWarningsAction(
  employeeId: string
): Promise<EmployeeWarning[]> {
  await requireHrOrAdmin();

  if (!employeeId) {
    throw new Error("Employee ID is required");
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("employee_warnings")
    .select(
      `
      id,
      employee_id,
      issued_by,
      warning_type,
      description,
      related_attendance_ids,
      created_at,
      profiles!employee_warnings_issued_by_fkey(full_name)
    `
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => {
    const issuer = row.profiles as unknown as { full_name: string } | null;

    return {
      id: row.id,
      employee_id: row.employee_id,
      issued_by: row.issued_by,
      warning_type: row.warning_type as EmployeeWarning["warning_type"],
      description: row.description,
      related_attendance_ids: row.related_attendance_ids ?? [],
      created_at: row.created_at,
      issuer_name: issuer?.full_name ?? "Unknown",
    };
  });
}

// ── 6. Mark Leave / Absence ──

export async function markLeaveAction(data: LeaveMarkInput) {
  const profile = await requireHrOrAdmin();

  const parsed = leaveMarkSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const adminClient = createAdminClient();

  // Verify the employee exists and get location info
  const { data: employee, error: empError } = await adminClient
    .from("employees")
    .select("id, full_name, primary_location_id")
    .eq("id", parsed.data.employee_id)
    .single();

  if (empError || !employee) {
    throw new Error("Employee not found");
  }

  // Check if attendance record already exists for that employee on that date
  const dateStart = `${parsed.data.date}T00:00:00.000Z`;
  const dateEnd = `${parsed.data.date}T23:59:59.999Z`;

  const { data: existing } = await adminClient
    .from("attendance_records")
    .select("id, status, leave_reason")
    .eq("employee_id", parsed.data.employee_id)
    .gte("clock_in", dateStart)
    .lte("clock_in", dateEnd)
    .limit(1);

  // Find the caller's employee record for submitted_by
  const { data: callerEmployee } = await adminClient
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const submittedBy = callerEmployee?.id ?? null;

  let targetRecordId: string;
  let oldValues: Record<string, unknown> | null = null;

  if (existing && existing.length > 0) {
    // Update existing record
    const existingRecord = existing[0];
    targetRecordId = existingRecord.id;

    oldValues = {
      status: existingRecord.status,
      leave_reason: existingRecord.leave_reason,
    };

    const { error: updateError } = await adminClient
      .from("attendance_records")
      .update({
        status: parsed.data.status,
        leave_reason: parsed.data.reason,
        is_corrected: true,
      })
      .eq("id", existingRecord.id);

    if (updateError) throw new Error(updateError.message);
  } else {
    // Insert new record
    const { data: inserted, error: insertError } = await adminClient
      .from("attendance_records")
      .insert({
        employee_id: parsed.data.employee_id,
        location_id: employee.primary_location_id,
        clock_in: dateStart,
        clock_in_method: "manual_correction",
        status: parsed.data.status,
        leave_reason: parsed.data.reason,
        submitted_by: submittedBy,
        is_corrected: true,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);
    targetRecordId = inserted!.id;
  }

  await logHrAction(adminClient, {
    action_type: "leave_mark",
    target_table: "attendance_records",
    target_record_id: targetRecordId,
    performed_by: profile.id,
    old_values: oldValues,
    new_values: {
      status: parsed.data.status,
      leave_reason: parsed.data.reason,
      date: parsed.data.date,
      employee_id: parsed.data.employee_id,
    },
    reason: parsed.data.reason,
  });

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/hr-actions");

  return { success: true, record_id: targetRecordId };
}

// ── 7. Get Correctable Records ──

export interface CorrectableRecord {
  id: string;
  employee_name: string;
  employee_number: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  location_name: string;
  shift_name: string | null;
  is_corrected: boolean;
}

export async function getCorrectableRecordsAction(
  filters?: { from?: string; to?: string; search?: string }
): Promise<CorrectableRecord[]> {
  await requireHrOrAdmin();
  const adminClient = createAdminClient();

  // Default: last 7 days
  const from = filters?.from
    ? `${filters.from}T00:00:00.000Z`
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = filters?.to
    ? `${filters.to}T23:59:59.999Z`
    : new Date().toISOString();

  const { data, error } = await adminClient
    .from("attendance_records")
    .select(
      `
      id,
      clock_in,
      clock_out,
      status,
      is_corrected,
      employees!attendance_records_employee_id_fkey(full_name, employee_number),
      locations(name),
      shifts(name)
    `
    )
    .gte("clock_in", from)
    .lte("clock_in", to)
    .order("clock_in", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!data) return [];

  let results = data.map((row) => {
    const emp = row.employees as unknown as { full_name: string; employee_number: string };
    const loc = row.locations as unknown as { name: string } | null;
    const shift = row.shifts as unknown as { name: string } | null;

    return {
      id: row.id,
      employee_name: emp.full_name,
      employee_number: emp.employee_number,
      clock_in: row.clock_in,
      clock_out: row.clock_out,
      status: row.status,
      location_name: loc?.name ?? "Unknown",
      shift_name: shift?.name ?? null,
      is_corrected: row.is_corrected ?? false,
    };
  });

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (r) =>
        r.employee_name.toLowerCase().includes(q) ||
        r.employee_number.toLowerCase().includes(q)
    );
  }

  return results;
}

// ── 8. Get Audit Log ──

export async function getAuditLogAction(
  filters?: {
    actionType?: string;
    from?: string;
    to?: string;
  }
): Promise<HrActionLog[]> {
  await requireHrOrAdmin();

  const adminClient = createAdminClient();

  let query = adminClient
    .from("hr_action_logs")
    .select(
      `
      id,
      action_type,
      target_table,
      target_record_id,
      performed_by,
      old_values,
      new_values,
      reason,
      created_at,
      profiles!hr_action_logs_performed_by_fkey(full_name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.actionType) {
    query = query.eq("action_type", filters.actionType);
  }

  if (filters?.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }

  if (filters?.to) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => {
    const performer = row.profiles as unknown as { full_name: string } | null;

    return {
      id: row.id,
      action_type: row.action_type,
      target_table: row.target_table,
      target_record_id: row.target_record_id,
      performed_by: row.performed_by,
      old_values: row.old_values as Record<string, unknown> | null,
      new_values: row.new_values as Record<string, unknown> | null,
      reason: row.reason,
      created_at: row.created_at,
      performer_name: performer?.full_name ?? "Unknown",
    };
  });
}

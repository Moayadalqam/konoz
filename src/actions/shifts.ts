"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  shiftSchema,
  shiftAssignmentSchema,
  type ShiftFormData,
  type ShiftAssignmentFormData,
  type ShiftWithAssignmentCount,
  type ShiftAssignmentWithDetails,
} from "@/lib/validations/shift";

export async function createShiftAction(data: ShiftFormData) {
  await requireRole("admin", "hr_officer");

  const parsed = shiftSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  const { error } = await supabase.from("shifts").insert({
    name: parsed.data.name,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    break_duration_minutes: parsed.data.break_duration_minutes,
    grace_period_minutes: parsed.data.grace_period_minutes,
    is_active: parsed.data.is_active,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shifts");
}

export async function updateShiftAction(id: string, data: ShiftFormData) {
  await requireRole("admin", "hr_officer");

  if (!id) throw new Error("Invalid shift ID");

  const parsed = shiftSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("shifts")
    .update({
      name: parsed.data.name,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      break_duration_minutes: parsed.data.break_duration_minutes,
      grace_period_minutes: parsed.data.grace_period_minutes,
      is_active: parsed.data.is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shifts");
}

export async function deleteShiftAction(id: string) {
  await requireRole("admin", "hr_officer");

  if (!id) throw new Error("Invalid shift ID");

  const supabase = await createClient();

  const { error } = await supabase
    .from("shifts")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shifts");
}

export async function getShiftsAction(): Promise<ShiftWithAssignmentCount[]> {
  const supabase = await createClient();

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  if (!shifts) return [];

  // Get assignment counts for all active shifts
  const { data: assignments, error: countError } = await supabase
    .from("shift_assignments")
    .select("shift_id");

  if (countError) throw new Error(countError.message);

  const countMap: Record<string, number> = {};
  for (const a of assignments || []) {
    countMap[a.shift_id] = (countMap[a.shift_id] || 0) + 1;
  }

  return shifts.map((shift) => ({
    ...shift,
    assignment_count: countMap[shift.id] || 0,
  }));
}

export async function assignShiftAction(data: ShiftAssignmentFormData) {
  await requireRole("admin", "hr_officer");

  const parsed = shiftAssignmentSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  const { error } = await supabase.from("shift_assignments").insert({
    shift_id: parsed.data.shift_id,
    location_id: parsed.data.location_id || null,
    employee_id: parsed.data.employee_id || null,
    effective_from: parsed.data.effective_from,
    effective_to: parsed.data.effective_to || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shifts");
}

export async function removeShiftAssignmentAction(id: string) {
  await requireRole("admin", "hr_officer");

  if (!id) throw new Error("Invalid assignment ID");

  const supabase = await createClient();

  const { error } = await supabase
    .from("shift_assignments")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shifts");
}

export async function getShiftAssignmentsAction(
  shiftId?: string
): Promise<ShiftAssignmentWithDetails[]> {
  const supabase = await createClient();

  let query = supabase
    .from("shift_assignments")
    .select(
      "*, shifts(name, start_time, end_time), locations(name), employees(full_name, employee_number)"
    );

  if (shiftId) {
    query = query.eq("shift_id", shiftId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data as ShiftAssignmentWithDetails[]) || [];
}

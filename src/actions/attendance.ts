"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  clockInSchema,
  clockOutSchema,
  type ClockInInput,
  type ClockOutInput,
  type TodayStatusResult,
  type AttendanceFilters,
} from "@/lib/validations/attendance";
import { isWithinGeofence, validateGpsReading } from "@/lib/geo/geofence";
import { computeShiftStatus } from "@/lib/shifts/time-rules";
import { resolveEmployeeShift } from "@/lib/shifts/resolve";
import type { Shift } from "@/lib/validations/shift";
import {
  notifyGeofenceViolation,
  notifyLateArrival,
} from "@/lib/notifications/create";

export async function clockInAction(data: ClockInInput) {
  const profile = await requireAuth();

  const parsed = clockInSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  // Get employee record for current user
  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("id, primary_location_id, full_name")
    .eq("profile_id", profile.id)
    .single();

  if (empError || !employee) {
    throw new Error("No employee record linked to your account");
  }

  if (!employee.primary_location_id) {
    throw new Error("You are not assigned to any location");
  }

  // Get assigned location for geofence check
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("id, name, latitude, longitude, geofence_radius_meters")
    .eq("id", employee.primary_location_id)
    .single();

  if (locError || !location) {
    throw new Error("Assigned location not found");
  }

  // Check for existing open clock-in today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, clock_out")
    .eq("employee_id", employee.id)
    .gte("clock_in", todayStart.toISOString())
    .is("clock_out", null)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("You are already clocked in. Please clock out first.");
  }

  // Geofence validation
  const withinGeofence = isWithinGeofence(
    parsed.data.latitude,
    parsed.data.longitude,
    location.latitude,
    location.longitude,
    location.geofence_radius_meters
  );

  // GPS quality check (warnings only, don't block)
  const gpsCheck = validateGpsReading(
    parsed.data.latitude,
    parsed.data.longitude,
    parsed.data.accuracy ?? null
  );

  const now = new Date().toISOString();

  // Resolve shift for late-arrival detection
  const shift = await resolveEmployeeShift(supabase, employee.id);
  let shiftId: string | null = null;
  let status: string = "present";

  if (shift) {
    const shiftResult = computeShiftStatus({
      shift,
      clockIn: new Date(now),
      clockOut: null,
    });
    if (shiftResult) {
      shiftId = shiftResult.shiftId;
      status = shiftResult.status;
    }
  }

  const { data: insertedRecord, error: insertError } = await supabase
    .from("attendance_records")
    .insert({
      employee_id: employee.id,
      location_id: location.id,
      clock_in: now,
      clock_in_lat: parsed.data.latitude,
      clock_in_lng: parsed.data.longitude,
      clock_in_accuracy: parsed.data.accuracy ?? null,
      clock_in_within_geofence: withinGeofence,
      clock_in_method: "self",
      submitted_by: employee.id,
      client_created_at: now,
      notes: gpsCheck.warnings.length > 0
        ? `[GPS] ${gpsCheck.warnings.join("; ")}`
        : null,
      shift_id: shiftId,
      status,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  const attendanceId = insertedRecord?.id ?? "";

  // Fire-and-forget notifications (don't block clock-in response)
  if (!withinGeofence) {
    void notifyGeofenceViolation(
      employee.full_name,
      location.name,
      attendanceId,
      employee.id,
      location.id
    ).catch(() => {});
  }

  if (status === "late" && shift) {
    const shiftStartParts = shift.start_time.split(":");
    const shiftStart = new Date(now);
    shiftStart.setHours(
      parseInt(shiftStartParts[0]),
      parseInt(shiftStartParts[1]),
      0,
      0
    );
    const minutesLate = Math.round(
      (new Date(now).getTime() - shiftStart.getTime()) / 60000
    );

    void notifyLateArrival(
      employee.full_name,
      location.name,
      minutesLate > 0 ? minutesLate : 1,
      location.id,
      attendanceId,
      employee.id
    ).catch(() => {});
  }

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");

  return {
    success: true,
    location_name: location.name,
    within_geofence: withinGeofence,
    time: now,
    shift_id: shiftId,
    status,
  };
}

export async function clockOutAction(data: ClockOutInput) {
  const profile = await requireAuth();

  const parsed = clockOutSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  // Get employee record
  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("id, primary_location_id")
    .eq("profile_id", profile.id)
    .single();

  if (empError || !employee) {
    throw new Error("No employee record linked to your account");
  }

  // Get the attendance record
  const { data: record, error: recError } = await supabase
    .from("attendance_records")
    .select("id, clock_in, location_id, shift_id")
    .eq("id", parsed.data.attendance_id)
    .eq("employee_id", employee.id)
    .is("clock_out", null)
    .single();

  if (recError || !record) {
    throw new Error("No open clock-in record found");
  }

  // Get location for geofence check
  const { data: location } = await supabase
    .from("locations")
    .select("latitude, longitude, geofence_radius_meters, name")
    .eq("id", record.location_id)
    .single();

  const withinGeofence = location
    ? isWithinGeofence(
        parsed.data.latitude,
        parsed.data.longitude,
        location.latitude,
        location.longitude,
        location.geofence_radius_meters
      )
    : null;

  const now = new Date();
  const clockInTime = new Date(record.clock_in);
  const totalMinutes = Math.round(
    (now.getTime() - clockInTime.getTime()) / 60000
  );

  // Evaluate shift status on clock-out (late, early departure, overtime)
  let status: string = "present";
  let isOvertime = false;
  let overtimeMinutes = 0;

  if (record.shift_id) {
    const { data: shift } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", record.shift_id)
      .single();

    if (shift) {
      const shiftResult = computeShiftStatus({
        shift: shift as Shift,
        clockIn: clockInTime,
        clockOut: now,
      });
      if (shiftResult) {
        status = shiftResult.status;
        isOvertime = shiftResult.isOvertime;
        overtimeMinutes = shiftResult.overtimeMinutes;
      }
    }
  }

  const { error: updateError } = await supabase
    .from("attendance_records")
    .update({
      clock_out: now.toISOString(),
      clock_out_lat: parsed.data.latitude,
      clock_out_lng: parsed.data.longitude,
      clock_out_accuracy: parsed.data.accuracy ?? null,
      clock_out_within_geofence: withinGeofence,
      clock_out_method: "self",
      total_minutes: totalMinutes,
      status,
      is_overtime: isOvertime,
      overtime_minutes: overtimeMinutes,
    })
    .eq("id", parsed.data.attendance_id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return {
    success: true,
    total_minutes: totalMinutes,
    formatted_duration: `${hours}h ${mins}m`,
    within_geofence: withinGeofence,
    status,
    is_overtime: isOvertime,
    overtime_minutes: overtimeMinutes,
  };
}

export async function getTodayStatusAction(): Promise<TodayStatusResult> {
  const profile = await requireAuth();
  const supabase = await createClient();

  // Get employee record
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!employee) {
    return { status: "not_clocked_in" };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: records } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employee.id)
    .gte("clock_in", todayStart.toISOString())
    .order("clock_in", { ascending: false })
    .limit(1);

  if (!records || records.length === 0) {
    return { status: "not_clocked_in" };
  }

  const record = records[0];

  if (!record.clock_out) {
    return { status: "clocked_in", record };
  }

  return { status: "clocked_out", record };
}

export async function getMyAttendanceAction(filters?: AttendanceFilters) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!employee) return [];

  // Default: last 30 days
  const from = filters?.from
    ? new Date(filters.from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = filters?.to ? new Date(filters.to) : new Date();
  to.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, locations(name, city), shifts(name)")
    .eq("employee_id", employee.id)
    .gte("clock_in", from.toISOString())
    .lte("clock_in", to.toISOString())
    .order("clock_in", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

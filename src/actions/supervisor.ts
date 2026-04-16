"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  batchClockInSchema,
  attendanceNoteSchema,
  type BatchClockInInput,
  type AttendanceNoteInput,
  type SiteEmployeeAttendance,
} from "@/lib/validations/attendance";
import { isWithinGeofence } from "@/lib/geo/geofence";
import { computeShiftStatus } from "@/lib/shifts/time-rules";
import type { Shift } from "@/lib/validations/shift";

async function resolveEmployeeShift(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string
): Promise<Shift | null> {
  const { data: result } = await supabase.rpc("get_employee_shift", {
    p_employee_id: employeeId,
  });

  if (!result) return null;

  const { data: shift } = await supabase
    .from("shifts")
    .select("*")
    .eq("id", result)
    .single();

  return shift as Shift | null;
}

async function getEmployeeForProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string
) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, primary_location_id")
    .eq("profile_id", profileId)
    .single();

  if (error || !data) throw new Error("No employee record linked to your account");
  if (!data.primary_location_id) throw new Error("You are not assigned to a location");

  return data;
}

export async function batchClockInAction(data: BatchClockInInput) {
  const profile = await requireRole("supervisor", "admin", "hr_officer");

  const parsed = batchClockInSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const supervisor = await getEmployeeForProfile(supabase, profile.id);

  // Get location for geofence check
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("id, name, latitude, longitude, geofence_radius_meters")
    .eq("id", supervisor.primary_location_id!)
    .single();

  if (locError || !location) {
    throw new Error("Location not found");
  }

  // Verify all employees belong to this location
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, full_name")
    .in("id", parsed.data.employee_ids)
    .eq("primary_location_id", location.id)
    .eq("is_active", true);

  if (empError) throw new Error(empError.message);

  if (!employees || employees.length !== parsed.data.employee_ids.length) {
    throw new Error(
      "Some employees are not assigned to your location or are inactive"
    );
  }

  // Check which employees already have open clock-ins today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existingRecords } = await supabase
    .from("attendance_records")
    .select("employee_id")
    .in("employee_id", parsed.data.employee_ids)
    .gte("clock_in", todayStart.toISOString())
    .is("clock_out", null);

  const alreadyClockedIn = new Set(
    (existingRecords ?? []).map((r) => r.employee_id)
  );

  const eligibleIds = parsed.data.employee_ids.filter(
    (id) => !alreadyClockedIn.has(id)
  );

  if (eligibleIds.length === 0) {
    throw new Error("All selected employees are already clocked in");
  }

  // Geofence check with supervisor's coordinates
  const withinGeofence = isWithinGeofence(
    parsed.data.latitude,
    parsed.data.longitude,
    location.latitude,
    location.longitude,
    location.geofence_radius_meters
  );

  const now = new Date().toISOString();

  // Resolve shifts for all eligible employees in bulk (avoid N+1)
  const shiftMap = new Map<string, Shift | null>();
  const { data: allAssignments } = await supabase
    .from("shift_assignments")
    .select("employee_id, shift_id")
    .in("employee_id", eligibleIds)
    .is("effective_to", null);

  if (allAssignments && allAssignments.length > 0) {
    const uniqueShiftIds = [...new Set(allAssignments.map((a) => a.shift_id))];
    const { data: shifts } = await supabase
      .from("shifts")
      .select("*")
      .in("id", uniqueShiftIds);

    const shiftLookup = new Map((shifts ?? []).map((s) => [s.id, s as Shift]));
    for (const a of allAssignments) {
      if (a.employee_id) shiftMap.set(a.employee_id, shiftLookup.get(a.shift_id) ?? null);
    }
  }

  const records = eligibleIds.map((employeeId) => {
    const shift = shiftMap.get(employeeId);
    let shiftId: string | null = null;
    let status: string = "present";

    if (shift) {
      const result = computeShiftStatus({
        shift,
        clockIn: new Date(now),
        clockOut: null,
      });
      if (result) {
        shiftId = result.shiftId;
        status = result.status;
      }
    }

    return {
      employee_id: employeeId,
      location_id: location.id,
      clock_in: now,
      clock_in_lat: parsed.data.latitude,
      clock_in_lng: parsed.data.longitude,
      clock_in_accuracy: parsed.data.accuracy ?? null,
      clock_in_within_geofence: withinGeofence,
      clock_in_method: "supervisor_batch" as const,
      submitted_by: supervisor.id,
      client_created_at: now,
      notes: parsed.data.notes || null,
      shift_id: shiftId,
      status,
    };
  });

  const { error: insertError } = await supabase
    .from("attendance_records")
    .insert(records);

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");

  return {
    success: true,
    count: eligibleIds.length,
    skipped: alreadyClockedIn.size,
    location_name: location.name,
  };
}

export async function batchClockOutAction(employeeIds: string[]) {
  const profile = await requireRole("supervisor", "admin", "hr_officer");

  if (!employeeIds.length) throw new Error("No employees selected");

  const supabase = await createClient();
  const supervisor = await getEmployeeForProfile(supabase, profile.id);

  const now = new Date();
  let closedCount = 0;

  // Find open records for these employees at supervisor's location
  const { data: openRecords, error: fetchError } = await supabase
    .from("attendance_records")
    .select("id, employee_id, clock_in, shift_id")
    .in("employee_id", employeeIds)
    .eq("location_id", supervisor.primary_location_id!)
    .is("clock_out", null);

  if (fetchError) throw new Error(fetchError.message);

  if (!openRecords || openRecords.length === 0) {
    throw new Error("No open clock-in records found for selected employees");
  }

  // Fetch all referenced shifts in one query (avoid N+1)
  const uniqueShiftIds = [...new Set(openRecords.filter((r) => r.shift_id).map((r) => r.shift_id!))];
  const shiftLookup = new Map<string, Shift>();
  if (uniqueShiftIds.length > 0) {
    const { data: shifts } = await supabase
      .from("shifts")
      .select("*")
      .in("id", uniqueShiftIds);
    for (const s of shifts ?? []) {
      shiftLookup.set(s.id, s as Shift);
    }
  }

  for (const record of openRecords) {
    const clockInTime = new Date(record.clock_in);
    const totalMinutes = Math.round(
      (now.getTime() - clockInTime.getTime()) / 60000
    );

    let status: string = "present";
    let isOvertime = false;
    let overtimeMinutes = 0;

    if (record.shift_id) {
      const shift = shiftLookup.get(record.shift_id);
      if (shift) {
        const shiftResult = computeShiftStatus({
          shift,
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

    const { error } = await supabase
      .from("attendance_records")
      .update({
        clock_out: now.toISOString(),
        clock_out_method: "supervisor_batch",
        total_minutes: totalMinutes,
        status,
        is_overtime: isOvertime,
        overtime_minutes: overtimeMinutes,
      })
      .eq("id", record.id);

    if (!error) closedCount++;
  }

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");

  return { success: true, count: closedCount };
}

export async function getSiteAttendanceAction(): Promise<SiteEmployeeAttendance[]> {
  const profile = await requireRole("supervisor", "admin", "hr_officer");
  const supabase = await createClient();

  // Admin/HR see ALL employees; supervisor sees only their location
  let employeeQuery = supabase
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("is_active", true)
    .order("full_name");

  if (profile.role === "supervisor") {
    const supervisor = await getEmployeeForProfile(supabase, profile.id);
    employeeQuery = employeeQuery.eq("primary_location_id", supervisor.primary_location_id!);
  }

  const { data: employees, error: empError } = await employeeQuery;

  if (empError) throw new Error(empError.message);
  if (!employees || employees.length === 0) return [];

  // Get today's attendance records for these employees
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const employeeIds = employees.map((e) => e.id);

  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, employee_id, clock_in, clock_out, total_minutes, clock_in_method, notes, status, shift_id, is_overtime, overtime_minutes, clock_in_photo_url, clock_in_lat, clock_in_lng, shifts(name)")
    .in("employee_id", employeeIds)
    .gte("clock_in", todayStart.toISOString())
    .order("clock_in", { ascending: false });

  // Build a map: employee_id -> latest record
  const recordMap = new Map<string, (typeof records extends (infer T)[] | null ? T : never)>();
  for (const record of records ?? []) {
    if (!recordMap.has(record.employee_id)) {
      recordMap.set(record.employee_id, record);
    }
  }

  return employees.map((emp) => {
    const record = recordMap.get(emp.id);

    const shiftRaw = record?.shifts as unknown;
    const shiftName = shiftRaw && typeof shiftRaw === "object" && "name" in (shiftRaw as Record<string, unknown>)
      ? (shiftRaw as { name: string }).name
      : Array.isArray(shiftRaw) && shiftRaw.length > 0
        ? (shiftRaw[0] as { name: string }).name
        : null;

    if (!record) {
      return {
        employee_id: emp.id,
        full_name: emp.full_name,
        employee_number: emp.employee_number,
        status: "not_yet" as const,
      };
    }

    if (!record.clock_out) {
      return {
        employee_id: emp.id,
        full_name: emp.full_name,
        employee_number: emp.employee_number,
        status: "checked_in" as const,
        clock_in: record.clock_in,
        clock_in_method: record.clock_in_method,
        attendance_id: record.id,
        notes: record.notes,
        shift_name: shiftName,
        attendance_status: record.status as SiteEmployeeAttendance["attendance_status"],
        is_overtime: record.is_overtime ?? false,
        overtime_minutes: record.overtime_minutes ?? 0,
        clock_in_photo_url: record.clock_in_photo_url,
        clock_in_lat: record.clock_in_lat,
        clock_in_lng: record.clock_in_lng,
      };
    }

    return {
      employee_id: emp.id,
      full_name: emp.full_name,
      employee_number: emp.employee_number,
      status: "checked_out" as const,
      clock_in: record.clock_in,
      clock_out: record.clock_out,
      total_minutes: record.total_minutes,
      clock_in_method: record.clock_in_method,
      attendance_id: record.id,
      notes: record.notes,
      shift_name: shiftName,
      attendance_status: record.status as SiteEmployeeAttendance["attendance_status"],
      is_overtime: record.is_overtime ?? false,
      overtime_minutes: record.overtime_minutes ?? 0,
      clock_in_photo_url: record.clock_in_photo_url,
      clock_in_lat: record.clock_in_lat,
      clock_in_lng: record.clock_in_lng,
    };
  });
}

export async function getLocationAttendanceAction(locationId: string): Promise<SiteEmployeeAttendance[]> {
  await requireRole("admin", "hr_officer");
  const supabase = await createClient();

  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("primary_location_id", locationId)
    .eq("is_active", true)
    .order("full_name");

  if (empError) throw new Error(empError.message);
  if (!employees || employees.length === 0) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const employeeIds = employees.map((e) => e.id);

  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, employee_id, clock_in, clock_out, total_minutes, clock_in_method, notes, status, shift_id, is_overtime, overtime_minutes, clock_in_photo_url, clock_in_lat, clock_in_lng, shifts(name)")
    .in("employee_id", employeeIds)
    .gte("clock_in", todayStart.toISOString())
    .order("clock_in", { ascending: false });

  const recordMap = new Map<string, (typeof records extends (infer T)[] | null ? T : never)>();
  for (const record of records ?? []) {
    if (!recordMap.has(record.employee_id)) {
      recordMap.set(record.employee_id, record);
    }
  }

  return employees.map((emp) => {
    const record = recordMap.get(emp.id);
    const shiftRaw = record?.shifts as unknown;
    const shiftName = shiftRaw && typeof shiftRaw === "object" && "name" in (shiftRaw as Record<string, unknown>)
      ? (shiftRaw as { name: string }).name
      : Array.isArray(shiftRaw) && shiftRaw.length > 0
        ? (shiftRaw[0] as { name: string }).name
        : null;

    if (!record) {
      return { employee_id: emp.id, full_name: emp.full_name, employee_number: emp.employee_number, status: "not_yet" as const };
    }

    return {
      employee_id: emp.id,
      full_name: emp.full_name,
      employee_number: emp.employee_number,
      status: (record.clock_out ? "checked_out" : "checked_in") as "checked_in" | "checked_out",
      clock_in: record.clock_in,
      clock_out: record.clock_out ?? undefined,
      total_minutes: record.total_minutes,
      clock_in_method: record.clock_in_method,
      attendance_id: record.id,
      notes: record.notes,
      shift_name: shiftName,
      attendance_status: record.status as SiteEmployeeAttendance["attendance_status"],
      is_overtime: record.is_overtime ?? false,
      overtime_minutes: record.overtime_minutes ?? 0,
      clock_in_photo_url: record.clock_in_photo_url,
      clock_in_lat: record.clock_in_lat,
      clock_in_lng: record.clock_in_lng,
    };
  });
}

export async function addAttendanceNoteAction(data: AttendanceNoteInput) {
  await requireRole("supervisor", "admin", "hr_officer");

  const parsed = attendanceNoteSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("attendance_records")
    .update({ notes: parsed.data.notes })
    .eq("id", parsed.data.attendance_id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/attendance");
}

export async function flagAnomalyAction(
  attendanceId: string,
  reason: string
) {
  await requireRole("supervisor", "admin", "hr_officer");

  if (!attendanceId || !reason) {
    throw new Error("Attendance ID and reason are required");
  }

  const supabase = await createClient();

  // Get current notes
  const { data: record, error: fetchError } = await supabase
    .from("attendance_records")
    .select("notes")
    .eq("id", attendanceId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const existingNotes = record?.notes ?? "";
  const flaggedNotes = `[ANOMALY] ${reason}${existingNotes ? `\n${existingNotes}` : ""}`;

  const { error } = await supabase
    .from("attendance_records")
    .update({ notes: flaggedNotes })
    .eq("id", attendanceId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/attendance");
}

export async function getLocationForSupervisor() {
  const profile = await requireRole("supervisor", "admin", "hr_officer");
  const supabase = await createClient();

  // Admin/HR see all locations
  if (profile.role === "admin" || profile.role === "hr_officer") {
    return { id: "all", name: "All Locations", city: "" };
  }

  const supervisor = await getEmployeeForProfile(supabase, profile.id);

  const { data: location } = await supabase
    .from("locations")
    .select("id, name, city")
    .eq("id", supervisor.primary_location_id!)
    .single();

  return location;
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/dal";
import { getTodayStart } from "@/lib/date-utils";
import type { AttendanceTrendPoint } from "@/lib/validations/reports";

export interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  overtimeThisWeek: number;
  // Per-site breakdown
  sites: {
    locationId: string;
    locationName: string;
    totalEmployees: number;
    presentCount: number;
  }[];
}

export async function getAttendanceStatsAction(): Promise<AttendanceStats> {
  await requireRole("admin", "hr_officer");
  const adminClient = createAdminClient();

  const todayStart = getTodayStart();

  // Get all active employees with their locations
  const { data: employees } = await adminClient
    .from("employees")
    .select("id, primary_location_id, locations(id, name)")
    .eq("is_active", true);

  const totalEmployees = employees?.length ?? 0;

  // Get today's attendance records (include status and overtime)
  const { data: records } = await adminClient
    .from("attendance_records")
    .select("employee_id, location_id, status, is_overtime, overtime_minutes")
    .gte("clock_in", todayStart.toISOString());

  const presentEmployeeIds = new Set(
    (records ?? []).map((r) => r.employee_id)
  );

  const presentToday = presentEmployeeIds.size;
  const absentToday = totalEmployees - presentToday;

  // Count late arrivals today
  const lateToday = (records ?? []).filter((r) => r.status === "late").length;

  // Calculate overtime this week
  const weekStart = new Date();
  const dayOfWeek = weekStart.getDay();
  // Start from Sunday (or Monday depending on locale — use Sunday for simplicity)
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  let overtimeThisWeek = 0;
  // If today is the only day in the query, just sum today's overtime
  // For a full week, we need a separate query
  if (dayOfWeek === 0) {
    // Sunday — only today's records
    overtimeThisWeek = (records ?? []).reduce(
      (sum, r) => sum + (r.is_overtime ? (r.overtime_minutes ?? 0) : 0),
      0
    );
  } else {
    // Fetch this week's overtime
    const { data: weekRecords } = await adminClient
      .from("attendance_records")
      .select("overtime_minutes")
      .eq("is_overtime", true)
      .gte("clock_in", weekStart.toISOString());

    overtimeThisWeek = (weekRecords ?? []).reduce(
      (sum, r) => sum + (r.overtime_minutes ?? 0),
      0
    );
  }

  // Per-site breakdown
  const siteMap = new Map<string, { name: string; total: number; present: number }>();

  for (const emp of employees ?? []) {
    const locId = emp.primary_location_id;
    if (!locId) continue;
    const loc = emp.locations as unknown as { id: string; name: string } | null;
    const locName = loc?.name ?? "Unknown";

    if (!siteMap.has(locId)) {
      siteMap.set(locId, { name: locName, total: 0, present: 0 });
    }
    const site = siteMap.get(locId)!;
    site.total++;
    if (presentEmployeeIds.has(emp.id)) {
      site.present++;
    }
  }

  const sites = Array.from(siteMap.entries()).map(([locationId, data]) => ({
    locationId,
    locationName: data.name,
    totalEmployees: data.total,
    presentCount: data.present,
  }));

  return { totalEmployees, presentToday, absentToday, lateToday, overtimeThisWeek, sites };
}

export async function getAttendanceTrendAction(
  days: number = 7
) {
  await requireRole("admin", "hr_officer");
  const adminClient = createAdminClient();

  // Get total active employees
  const { count: totalEmployees } = await adminClient
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const total = totalEmployees ?? 0;

  // Calculate date range
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  // Fetch all records in the range in a single query
  const { data: records } = await adminClient
    .from("attendance_records")
    .select("employee_id, clock_in, status")
    .gte("clock_in", startDate.toISOString())
    .lte("clock_in", endDate.toISOString());

  // Group by date
  const dayMap = new Map<string, { present: Set<string>; late: number }>();

  for (const rec of records ?? []) {
    const dateKey = rec.clock_in.slice(0, 10);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { present: new Set(), late: 0 });
    }
    const day = dayMap.get(dateKey)!;
    day.present.add(rec.employee_id);
    if (rec.status === "late") day.late++;
  }

  // Build trend array for each day
  const trend: AttendanceTrendPoint[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateKey = cursor.toISOString().slice(0, 10);
    // Skip Fridays (Jordan weekend)
    if (cursor.getDay() !== 5) {
      const day = dayMap.get(dateKey);
      trend.push({
        date: dateKey,
        present: day?.present.size ?? 0,
        absent: total - (day?.present.size ?? 0),
        late: day?.late ?? 0,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return trend;
}

export interface EmployeeDashboardStats {
  daysThisWeek: number;
  hoursThisMonth: number;
  lateThisMonth: number;
  recentRecords: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    status: string;
    total_minutes: number | null;
    location_name: string;
  }[];
}

export async function getEmployeeDashboardStats(): Promise<EmployeeDashboardStats> {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!employee) {
    return { daysThisWeek: 0, hoursThisMonth: 0, lateThisMonth: 0, recentRecords: [] };
  }

  // Week start (Sunday)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Month start
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Parallel: week records, month records, recent 5
  const [weekResult, monthResult, recentResult] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("clock_in")
      .eq("employee_id", employee.id)
      .gte("clock_in", weekStart.toISOString()),
    supabase
      .from("attendance_records")
      .select("total_minutes, status")
      .eq("employee_id", employee.id)
      .gte("clock_in", monthStart.toISOString()),
    supabase
      .from("attendance_records")
      .select("id, clock_in, clock_out, status, total_minutes, locations(name)")
      .eq("employee_id", employee.id)
      .order("clock_in", { ascending: false })
      .limit(5),
  ]);

  // Unique days this week
  const uniqueDays = new Set(
    (weekResult.data ?? []).map((r) => r.clock_in.slice(0, 10))
  );

  // Hours this month
  const totalMinutes = (monthResult.data ?? []).reduce(
    (sum, r) => sum + (r.total_minutes ?? 0),
    0
  );

  // Late count this month
  const lateCount = (monthResult.data ?? []).filter(
    (r) => r.status === "late"
  ).length;

  // Map recent records
  const recentRecords = (recentResult.data ?? []).map((r) => ({
    id: r.id,
    clock_in: r.clock_in,
    clock_out: r.clock_out,
    status: r.status,
    total_minutes: r.total_minutes,
    location_name: (r.locations as unknown as { name: string } | null)?.name ?? "Unknown",
  }));

  return {
    daysThisWeek: uniqueDays.size,
    hoursThisMonth: Math.round(totalMinutes / 60 * 10) / 10,
    lateThisMonth: lateCount,
    recentRecords,
  };
}

export async function getSupervisorStatsAction() {
  const profile = await requireAuth();
  const supabase = await createClient();

  // Get supervisor's employee record
  const { data: employee } = await supabase
    .from("employees")
    .select("id, primary_location_id")
    .eq("profile_id", profile.id)
    .single();

  if (!employee?.primary_location_id) {
    return { total: 0, present: 0, location: null };
  }

  // Get employee count at location
  const { count: total } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("primary_location_id", employee.primary_location_id)
    .eq("is_active", true);

  // Get today's attendance count
  const todayStart = getTodayStart();

  const { count: present } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("location_id", employee.primary_location_id)
    .gte("clock_in", todayStart.toISOString());

  const { data: location } = await supabase
    .from("locations")
    .select("name")
    .eq("id", employee.primary_location_id)
    .single();

  return {
    total: total ?? 0,
    present: present ?? 0,
    location: location?.name ?? null,
  };
}

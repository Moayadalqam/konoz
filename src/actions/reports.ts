"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/dal";
import { toSaudiDate } from "@/lib/date-utils";
import type {
  DailyAttendanceReport,
  DailySiteBreakdown,
  EmployeeSummaryRow,
  LateArrivalRow,
  OvertimeReport,
  OvertimeRow,
  OvertimeSiteSummary,
  AbsenceRow,
  SiteComparisonRow,
  ActivityFeedItem,
} from "@/lib/validations/reports";

async function requireHrOrAdmin() {
  return requireRole("admin", "hr_officer");
}

/** Saudi work week: Sun–Thu. Friday & Saturday = weekend. */
function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 5 && day !== 6;
}

function getBusinessDays(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (isBusinessDay(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

function validateDateRange(from: string, to: string) {
  dateStringSchema.parse(from);
  dateStringSchema.parse(to);
  if (new Date(to) < new Date(from)) throw new Error("End date must be after start date");
  const diffDays = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
  if (diffDays > 365) throw new Error("Date range cannot exceed 365 days");
}

function dateRange(from: string, to: string) {
  validateDateRange(from, to);
  // Saudi midnight = UTC+3
  const start = new Date(`${from}T00:00:00+03:00`);
  const end = new Date(`${to}T23:59:59.999+03:00`);
  return { start: start.toISOString(), end: end.toISOString(), startDate: start, endDate: end };
}

// ── RPT-02: Daily Attendance Report ──

export async function getDailyAttendanceReport(
  date: string,
  locationId?: string
): Promise<DailyAttendanceReport> {
  await requireHrOrAdmin();
  const admin = createAdminClient();

  const { start, end } = dateRange(date, date);

  // Get all active employees with locations
  let empQuery = admin
    .from("employees")
    .select("id, primary_location_id, locations(id, name)")
    .eq("is_active", true);

  if (locationId) {
    empQuery = empQuery.eq("primary_location_id", locationId);
  }

  const { data: employees } = await empQuery;

  // Get today's records
  let recQuery = admin
    .from("attendance_records")
    .select("employee_id, location_id, status")
    .gte("clock_in", start)
    .lte("clock_in", end);

  if (locationId) {
    recQuery = recQuery.eq("location_id", locationId);
  }

  const { data: records } = await recQuery;

  // Group employees by location
  const locMap = new Map<string, { name: string; employees: Set<string> }>();
  for (const emp of employees ?? []) {
    const locId = emp.primary_location_id;
    if (!locId) continue;
    const loc = emp.locations as unknown as { id: string; name: string } | null;
    if (!locMap.has(locId)) {
      locMap.set(locId, { name: loc?.name ?? "Unknown", employees: new Set() });
    }
    locMap.get(locId)!.employees.add(emp.id);
  }

  // Group records by location + status
  const recordsByLoc = new Map<string, Map<string, number>>();
  const presentByLoc = new Map<string, Set<string>>();

  for (const rec of records ?? []) {
    const locId = rec.location_id;
    if (!recordsByLoc.has(locId)) {
      recordsByLoc.set(locId, new Map());
      presentByLoc.set(locId, new Set());
    }
    const statusMap = recordsByLoc.get(locId)!;
    statusMap.set(rec.status, (statusMap.get(rec.status) ?? 0) + 1);
    presentByLoc.get(locId)!.add(rec.employee_id);
  }

  // Build site breakdowns
  const sites: DailySiteBreakdown[] = [];
  const totals = { present: 0, late: 0, earlyDeparture: 0, absent: 0, onLeave: 0, total: 0 };

  for (const [locId, locData] of locMap) {
    const statusMap = recordsByLoc.get(locId) ?? new Map();
    const presentSet = presentByLoc.get(locId) ?? new Set();
    const totalEmps = locData.employees.size;
    const absentCount = totalEmps - presentSet.size;

    const site: DailySiteBreakdown = {
      locationId: locId,
      locationName: locData.name,
      present: (statusMap.get("present") ?? 0),
      late: (statusMap.get("late") ?? 0),
      earlyDeparture: (statusMap.get("early_departure") ?? 0),
      absent: absentCount,
      onLeave: (statusMap.get("on_leave") ?? 0),
      total: totalEmps,
    };

    sites.push(site);
    totals.present += site.present;
    totals.late += site.late;
    totals.earlyDeparture += site.earlyDeparture;
    totals.absent += site.absent;
    totals.onLeave += site.onLeave;
    totals.total += site.total;
  }

  return { date, sites, totals };
}

// ── RPT-03: Employee Summary Report ──

export async function getEmployeeSummaryReport(
  from: string,
  to: string,
  employeeId?: string,
  locationId?: string
): Promise<EmployeeSummaryRow[]> {
  await requireHrOrAdmin();
  const admin = createAdminClient();

  const { start, end, startDate, endDate } = dateRange(from, to);
  const bizDays = getBusinessDays(startDate, endDate);

  // Get employees
  let empQuery = admin
    .from("employees")
    .select("id, full_name, employee_number, primary_location_id, locations(name)")
    .eq("is_active", true);

  if (employeeId) empQuery = empQuery.eq("id", employeeId);
  if (locationId) empQuery = empQuery.eq("primary_location_id", locationId);

  const { data: employees } = await empQuery;

  // Get all records in range
  let recQuery = admin
    .from("attendance_records")
    .select("employee_id, clock_in, total_minutes, overtime_minutes, status, is_overtime")
    .gte("clock_in", start)
    .lte("clock_in", end);

  if (employeeId) recQuery = recQuery.eq("employee_id", employeeId);
  if (locationId) recQuery = recQuery.eq("location_id", locationId);

  const { data: records } = await recQuery;

  // Group records by employee
  const empRecords = new Map<string, typeof records>();
  for (const rec of records ?? []) {
    if (!empRecords.has(rec.employee_id)) {
      empRecords.set(rec.employee_id, []);
    }
    empRecords.get(rec.employee_id)!.push(rec);
  }

  const rows: EmployeeSummaryRow[] = [];

  for (const emp of employees ?? []) {
    const recs = empRecords.get(emp.id) ?? [];
    const uniqueDays = new Set(recs.map((r) => toSaudiDate(r.clock_in)));
    const loc = emp.locations as unknown as { name: string } | null;

    rows.push({
      employeeId: emp.id,
      employeeName: emp.full_name,
      employeeNumber: emp.employee_number,
      locationName: loc?.name ?? "Unassigned",
      daysWorked: uniqueDays.size,
      totalHours: Math.round(recs.reduce((s, r) => s + (r.total_minutes ?? 0), 0) / 60 * 10) / 10,
      overtimeHours: Math.round(recs.reduce((s, r) => s + (r.overtime_minutes ?? 0), 0) / 60 * 10) / 10,
      absences: Math.max(0, bizDays - uniqueDays.size),
      lateCount: recs.filter((r) => r.status === "late").length,
      earlyDepartureCount: recs.filter((r) => r.status === "early_departure").length,
    });
  }

  return rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

// ── RPT-04: Late Arrivals Report ──

export async function getLateArrivalsReport(
  from: string,
  to: string,
  locationId?: string
): Promise<LateArrivalRow[]> {
  await requireHrOrAdmin();
  const admin = createAdminClient();

  const { start, end } = dateRange(from, to);

  let query = admin
    .from("attendance_records")
    .select("employee_id, clock_in, employees!attendance_records_employee_id_fkey(full_name, employee_number, primary_location_id, locations(name))")
    .eq("status", "late")
    .gte("clock_in", start)
    .lte("clock_in", end);

  if (locationId) query = query.eq("location_id", locationId);

  const { data: records } = await query;

  // Group by employee
  const empMap = new Map<string, { name: string; number: string; location: string; dates: string[] }>();

  for (const rec of records ?? []) {
    const emp = rec.employees as unknown as {
      full_name: string;
      employee_number: string;
      primary_location_id: string;
      locations: { name: string } | null;
    } | null;
    if (!emp) continue;

    if (!empMap.has(rec.employee_id)) {
      empMap.set(rec.employee_id, {
        name: emp.full_name,
        number: emp.employee_number,
        location: emp.locations?.name ?? "Unknown",
        dates: [],
      });
    }
    empMap.get(rec.employee_id)!.dates.push(toSaudiDate(rec.clock_in));
  }

  const rows: LateArrivalRow[] = Array.from(empMap.entries()).map(([id, data]) => ({
    employeeId: id,
    employeeName: data.name,
    employeeNumber: data.number,
    locationName: data.location,
    lateCount: data.dates.length,
    dates: [...new Set(data.dates)].sort(),
  }));

  return rows.sort((a, b) => b.lateCount - a.lateCount);
}

// ── RPT-05: Overtime Report ──

export async function getOvertimeReport(
  from: string,
  to: string,
  locationId?: string,
  employeeId?: string
): Promise<OvertimeReport> {
  await requireHrOrAdmin();
  const admin = createAdminClient();

  const { start, end } = dateRange(from, to);

  let query = admin
    .from("attendance_records")
    .select("employee_id, location_id, overtime_minutes, overtime_status, employees!attendance_records_employee_id_fkey(full_name, employee_number, primary_location_id), locations(id, name)")
    .eq("is_overtime", true)
    .gte("clock_in", start)
    .lte("clock_in", end);

  if (locationId) query = query.eq("location_id", locationId);
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data: records } = await query;

  // By employee
  const empMap = new Map<string, { name: string; number: string; location: string; minutes: number; count: number; statuses: Set<string> }>();
  // By site
  const siteMap = new Map<string, { name: string; minutes: number; employees: Set<string> }>();

  for (const rec of records ?? []) {
    const emp = rec.employees as unknown as { full_name: string; employee_number: string; primary_location_id: string } | null;
    const loc = rec.locations as unknown as { id: string; name: string } | null;

    // Employee aggregation
    if (!empMap.has(rec.employee_id)) {
      empMap.set(rec.employee_id, {
        name: emp?.full_name ?? "Unknown",
        number: emp?.employee_number ?? "",
        location: loc?.name ?? "Unknown",
        minutes: 0,
        count: 0,
        statuses: new Set(),
      });
    }
    const empData = empMap.get(rec.employee_id)!;
    empData.minutes += rec.overtime_minutes ?? 0;
    empData.count++;
    if (rec.overtime_status) empData.statuses.add(rec.overtime_status);

    // Site aggregation
    const locId = rec.location_id;
    if (locId) {
      if (!siteMap.has(locId)) {
        siteMap.set(locId, { name: loc?.name ?? "Unknown", minutes: 0, employees: new Set() });
      }
      const siteData = siteMap.get(locId)!;
      siteData.minutes += rec.overtime_minutes ?? 0;
      siteData.employees.add(rec.employee_id);
    }
  }

  const byEmployee: OvertimeRow[] = Array.from(empMap.entries()).map(([id, d]) => ({
    employeeId: id,
    employeeName: d.name,
    employeeNumber: d.number,
    locationName: d.location,
    totalOvertimeMinutes: d.minutes,
    recordCount: d.count,
    overtimeStatus: d.statuses.size === 1 ? ([...d.statuses][0] as OvertimeRow["overtimeStatus"]) : "mixed",
  }));

  const bySite: OvertimeSiteSummary[] = Array.from(siteMap.entries()).map(([id, d]) => ({
    locationId: id,
    locationName: d.name,
    totalOvertimeMinutes: d.minutes,
    employeeCount: d.employees.size,
  }));

  return {
    byEmployee: byEmployee.sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes),
    bySite: bySite.sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes),
  };
}

// ── RPT-06: Absence Report ──

export async function getAbsenceReport(
  from: string,
  to: string,
  locationId?: string
): Promise<AbsenceRow[]> {
  await requireHrOrAdmin();
  const admin = createAdminClient();

  const { start, end, startDate, endDate } = dateRange(from, to);

  // Get all active employees
  let empQuery = admin
    .from("employees")
    .select("id, full_name, employee_number, primary_location_id, locations(name)")
    .eq("is_active", true);

  if (locationId) empQuery = empQuery.eq("primary_location_id", locationId);

  const { data: employees } = await empQuery;

  // Get all records in range
  let recQuery = admin
    .from("attendance_records")
    .select("employee_id, clock_in")
    .gte("clock_in", start)
    .lte("clock_in", end);

  if (locationId) recQuery = recQuery.eq("location_id", locationId);

  const { data: records } = await recQuery;

  // Build set of (employee_id, date) pairs
  const presentDays = new Map<string, Set<string>>();
  for (const rec of records ?? []) {
    if (!presentDays.has(rec.employee_id)) {
      presentDays.set(rec.employee_id, new Set());
    }
    presentDays.get(rec.employee_id)!.add(toSaudiDate(rec.clock_in));
  }

  // Get all business days in range
  const allBizDays: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (isBusinessDay(cursor)) {
      allBizDays.push(cursor.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" }));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const rows: AbsenceRow[] = [];

  for (const emp of employees ?? []) {
    const empPresent = presentDays.get(emp.id) ?? new Set();
    const absentDates = allBizDays.filter((d) => !empPresent.has(d));

    if (absentDates.length === 0) continue;

    // Calculate max consecutive absences (consecutive business days)
    let maxConsecutive = 1;
    let currentStreak = 1;
    for (let i = 1; i < absentDates.length; i++) {
      const prev = new Date(absentDates[i - 1]);
      const curr = new Date(absentDates[i]);
      // Find the next business day after prev (skip Friday)
      const nextBizDay = new Date(prev);
      nextBizDay.setDate(nextBizDay.getDate() + 1);
      while (nextBizDay.getDay() === 5 || nextBizDay.getDay() === 6) {
        nextBizDay.setDate(nextBizDay.getDate() + 1); // skip Fri+Sat
      }
      if (curr.toLocaleDateString("en-CA") === nextBizDay.toLocaleDateString("en-CA")) {
        currentStreak++;
        maxConsecutive = Math.max(maxConsecutive, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    const loc = emp.locations as unknown as { name: string } | null;

    rows.push({
      employeeId: emp.id,
      employeeName: emp.full_name,
      employeeNumber: emp.employee_number,
      locationName: loc?.name ?? "Unassigned",
      absenceCount: absentDates.length,
      dates: absentDates,
      consecutiveMax: absentDates.length === 1 ? 1 : maxConsecutive,
    });
  }

  return rows.sort((a, b) => b.absenceCount - a.absenceCount);
}

// ── RPT-08: Site Comparison Report ──

export async function getSiteComparisonReport(
  from: string,
  to: string
): Promise<SiteComparisonRow[]> {
  await requireHrOrAdmin();
  const admin = createAdminClient();

  const { start, end, startDate, endDate } = dateRange(from, to);
  const bizDays = getBusinessDays(startDate, endDate);

  // Get locations with employee counts
  const { data: locations } = await admin
    .from("locations")
    .select("id, name, city");

  const { data: employees } = await admin
    .from("employees")
    .select("id, primary_location_id")
    .eq("is_active", true);

  // Get records
  const { data: records } = await admin
    .from("attendance_records")
    .select("employee_id, location_id, total_minutes, overtime_minutes, status, is_overtime")
    .gte("clock_in", start)
    .lte("clock_in", end);

  // Employee count per location
  const empCountByLoc = new Map<string, number>();
  for (const emp of employees ?? []) {
    if (emp.primary_location_id) {
      empCountByLoc.set(emp.primary_location_id, (empCountByLoc.get(emp.primary_location_id) ?? 0) + 1);
    }
  }

  // Records per location
  const recsByLoc = new Map<string, Array<{ total_minutes: number | null; overtime_minutes: number; status: string; employee_id: string; clock_in_date?: string }>>();
  for (const rec of records ?? []) {
    if (!recsByLoc.has(rec.location_id)) recsByLoc.set(rec.location_id, []);
    recsByLoc.get(rec.location_id)!.push(rec);
  }

  const rows: SiteComparisonRow[] = [];

  for (const loc of locations ?? []) {
    const totalEmps = empCountByLoc.get(loc.id) ?? 0;
    if (totalEmps === 0) continue;

    const locRecs = recsByLoc.get(loc.id) ?? [];
    const totalPossibleDays = totalEmps * bizDays;
    const attendedDays = locRecs.length;

    const totalMinutes = locRecs.reduce((s, r) => s + (r.total_minutes ?? 0), 0);
    const totalOtMinutes = locRecs.reduce((s, r) => s + (r.overtime_minutes ?? 0), 0);
    const lateCount = locRecs.filter((r) => r.status === "late").length;
    const absentDays = Math.max(0, totalPossibleDays - attendedDays);

    rows.push({
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      totalEmployees: totalEmps,
      attendanceRate: totalPossibleDays > 0 ? Math.round((attendedDays / totalPossibleDays) * 1000) / 10 : 0,
      avgHoursPerDay: attendedDays > 0 ? Math.round((totalMinutes / attendedDays / 60) * 10) / 10 : 0,
      totalOvertimeHours: Math.round(totalOtMinutes / 60 * 10) / 10,
      lateCount,
      absenceCount: absentDays,
    });
  }

  return rows.sort((a, b) => b.attendanceRate - a.attendanceRate);
}

// ── Activity Feed (for HR Dashboard) ──

export async function getRecentActivityFeed(
  limit: number = 20
): Promise<ActivityFeedItem[]> {
  await requireHrOrAdmin();
  const admin = createAdminClient();

  // Get recent records with clock-out events
  const { data: records } = await admin
    .from("attendance_records")
    .select("id, employee_id, clock_in, clock_out, status, employees!attendance_records_employee_id_fkey(full_name), locations(name)")
    .order("updated_at", { ascending: false })
    .limit(limit);

  const items: ActivityFeedItem[] = [];

  for (const rec of records ?? []) {
    const emp = rec.employees as unknown as { full_name: string } | null;
    const loc = rec.locations as unknown as { name: string } | null;

    // Determine if this is a clock-in or clock-out event
    const hasClockOut = !!rec.clock_out;
    items.push({
      id: rec.id,
      employeeName: emp?.full_name ?? "Unknown",
      action: hasClockOut ? "clock_out" : "clock_in",
      time: hasClockOut ? rec.clock_out! : rec.clock_in,
      locationName: loc?.name ?? "Unknown",
      status: rec.status,
    });
  }

  return items;
}

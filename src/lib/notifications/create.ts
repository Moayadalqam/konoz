import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayStart } from "@/lib/date-utils";
import type { NotificationType } from "@/lib/validations/notifications";

async function insertNotifications(
  recipients: string[],
  type: NotificationType,
  title: string,
  body: string,
  metadata: Record<string, unknown> = {}
) {
  if (recipients.length === 0) return;
  const admin = createAdminClient();

  const rows = recipients.map((recipient_id) => ({
    recipient_id,
    type,
    title,
    body,
    metadata,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.error(`[notifications] Failed to insert ${type}:`, error.message);
  }
}

async function getHrAndAdminIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["hr_officer", "admin"])
    .eq("registration_status", "approved");

  return data?.map((p) => p.id) ?? [];
}

async function getSupervisorIdsForLocation(
  locationId: string
): Promise<string[]> {
  const admin = createAdminClient();

  const { data: employees } = await admin
    .from("employees")
    .select("profile_id")
    .eq("primary_location_id", locationId)
    .eq("is_active", true)
    .not("profile_id", "is", null);

  if (!employees || employees.length === 0) return [];

  const profileIds = employees
    .map((e) => e.profile_id)
    .filter(Boolean) as string[];

  const { data: supervisors } = await admin
    .from("profiles")
    .select("id")
    .in("id", profileIds)
    .eq("role", "supervisor")
    .eq("registration_status", "approved");

  return supervisors?.map((s) => s.id) ?? [];
}

export async function notifyGeofenceViolation(
  employeeName: string,
  locationName: string,
  attendanceId: string,
  employeeId: string,
  locationId: string
) {
  const recipients = await getHrAndAdminIds();
  await insertNotifications(
    recipients,
    "geofence_violation",
    "Geofence violation",
    `${employeeName} checked in outside the geofence at ${locationName}.`,
    { employee_id: employeeId, attendance_id: attendanceId, location_id: locationId }
  );
}

export async function notifyLateArrival(
  employeeName: string,
  locationName: string,
  minutesLate: number,
  locationId: string,
  attendanceId: string,
  employeeId: string
) {
  const recipients = await getSupervisorIdsForLocation(locationId);
  await insertNotifications(
    recipients,
    "late_arrival",
    "Late arrival",
    `${employeeName} is ${minutesLate}min late at ${locationName}.`,
    { employee_id: employeeId, attendance_id: attendanceId, location_id: locationId }
  );
}

export async function generateDailySummaryIfNeeded(profileId: string) {
  const admin = createAdminClient();

  const todayStart = getTodayStart();

  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("recipient_id", profileId)
    .eq("type", "daily_anomaly_summary")
    .gte("created_at", todayStart.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return;

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { count: lateCount } = await admin
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("status", "late")
    .gte("clock_in", todayStart.toISOString())
    .lte("clock_in", todayEnd.toISOString());

  const { count: violationCount } = await admin
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("clock_in_within_geofence", false)
    .gte("clock_in", todayStart.toISOString())
    .lte("clock_in", todayEnd.toISOString());

  const { count: missingCount } = await admin
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .is("clock_out", null)
    .gte("clock_in", todayStart.toISOString())
    .lte("clock_in", todayEnd.toISOString());

  const late = lateCount ?? 0;
  const violations = violationCount ?? 0;
  const missing = missingCount ?? 0;

  if (late === 0 && violations === 0 && missing === 0) return;

  const parts: string[] = [];
  if (late > 0) parts.push(`${late} late arrival${late !== 1 ? "s" : ""}`);
  if (violations > 0)
    parts.push(`${violations} geofence violation${violations !== 1 ? "s" : ""}`);
  if (missing > 0)
    parts.push(`${missing} missing clock-out${missing !== 1 ? "s" : ""}`);

  await insertNotifications(
    [profileId],
    "daily_anomaly_summary",
    "Daily attendance summary",
    `Today: ${parts.join(", ")}.`,
    {
      date: todayStart.toISOString().split("T")[0],
      late_count: late,
      violation_count: violations,
      missing_clockout_count: missing,
    }
  );
}

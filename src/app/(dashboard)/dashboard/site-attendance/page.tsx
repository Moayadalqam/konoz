import { requireRole } from "@/lib/auth/dal";
import { getSiteAttendanceAction, getLocationForSupervisor } from "@/actions/supervisor";
import { SupervisorAttendance } from "@/components/attendance/supervisor-attendance";

export const metadata = {
  title: "Site Attendance -- Kunoz",
};

export default async function SiteAttendancePage() {
  await requireRole("supervisor", "admin", "hr_officer");

  const [employees, location] = await Promise.all([
    getSiteAttendanceAction(),
    getLocationForSupervisor(),
  ]);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <SupervisorAttendance
        employees={employees}
        locationName={location?.name ?? "Unknown Location"}
      />
    </div>
  );
}

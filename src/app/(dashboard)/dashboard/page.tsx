import { requireAuth } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { HrDashboard } from "@/components/dashboard/hr-dashboard";
import { SupervisorDashboard } from "@/components/dashboard/supervisor-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import {
  getAttendanceStatsAction,
  getAttendanceTrendAction,
  getSupervisorStatsAction,
} from "@/actions/attendance-stats";
import { getTodayStatusAction } from "@/actions/attendance";
import { getRecentActivityFeed } from "@/actions/reports";
import { generateDailySummaryIfNeeded } from "@/lib/notifications/create";

export const metadata = {
  title: "Dashboard -- Kunoz",
};

export default async function DashboardPage() {
  const profile = await requireAuth();

  // Generate daily anomaly summary for HR/admin (idempotent, once per day)
  if (profile.role === "hr_officer" || profile.role === "admin") {
    void generateDailySummaryIfNeeded(profile.id).catch(() => {});
  }

  // Fetch pending count for admin
  let pendingCount = 0;
  if (profile.role === "admin") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("registration_status", "pending");
    pendingCount = count ?? 0;
  }

  switch (profile.role) {
    case "admin": {
      const stats = await getAttendanceStatsAction();
      return (
        <AdminDashboard
          profile={profile}
          pendingCount={pendingCount}
          attendanceStats={stats}
        />
      );
    }
    case "hr_officer": {
      const [stats, trendData, activityFeed] = await Promise.all([
        getAttendanceStatsAction(),
        getAttendanceTrendAction(7),
        getRecentActivityFeed(10),
      ]);
      return (
        <HrDashboard
          profile={profile}
          attendanceStats={stats}
          trendData={trendData}
          activityFeed={activityFeed}
        />
      );
    }
    case "supervisor": {
      const supStats = await getSupervisorStatsAction();
      return (
        <SupervisorDashboard
          profile={profile}
          siteStats={supStats}
        />
      );
    }
    case "employee": {
      const todayStatus = await getTodayStatusAction();
      return <EmployeeDashboard profile={profile} todayStatus={todayStatus} />;
    }
  }
}

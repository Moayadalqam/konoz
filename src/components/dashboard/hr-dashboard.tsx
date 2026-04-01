"use client";

import Link from "next/link";
import {
  Users,
  Clock,
  UserX,
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import type { Profile } from "@/lib/auth/types";
import type { AttendanceStats } from "@/actions/attendance-stats";
import type { AttendanceTrendPoint, ActivityFeedItem } from "@/lib/validations/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { PageTransition } from "@/components/transitions/page-transition";

const AttendanceTrendChart = dynamic(
  () => import("@/components/reports/attendance-trend-chart").then((m) => m.AttendanceTrendChart),
  { ssr: false }
);

interface HrDashboardProps {
  profile: Profile;
  attendanceStats: AttendanceStats;
  trendData?: AttendanceTrendPoint[];
  activityFeed?: ActivityFeedItem[];
}

export function HrDashboard({ profile, attendanceStats, trendData, activityFeed }: HrDashboardProps) {
  const firstName = profile.full_name.split(" ")[0];

  return (
    <PageTransition className="w-full px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workforce overview for today
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={String(attendanceStats.totalEmployees)}
          sublabel="Active employees"
          accentClass="text-primary bg-primary/10"
        />
        <StatCard
          icon={Clock}
          label="Present Today"
          value={String(attendanceStats.presentToday)}
          sublabel="Clocked in"
          accentClass="text-success bg-success/10"
        />
        <StatCard
          icon={UserX}
          label="Absent Today"
          value={String(attendanceStats.absentToday)}
          sublabel="Not clocked in"
          accentClass="text-destructive bg-destructive/10"
        />
        <StatCard
          icon={AlertTriangle}
          label="Late Today"
          value={String(attendanceStats.lateToday)}
          sublabel="Late arrivals"
          accentClass="text-warning bg-warning/10"
        />
      </div>

      {/* Charts and activity */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData && trendData.length > 0 ? (
              <AttendanceTrendChart data={trendData} />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  No trend data available yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed && activityFeed.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          item.action === "clock_in"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }
                      >
                        {item.action === "clock_in" ? "IN" : "OUT"}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{item.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{item.locationName}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {new Date(item.time).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/dashboard/reports">
          <Card className="transition-colors hover:border-primary/30 cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">View Reports</p>
                <p className="text-xs text-muted-foreground">Attendance analytics &amp; exports</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/hr-actions">
          <Card className="transition-colors hover:border-primary/30 cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                <ClipboardCheck className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">HR Actions</p>
                <p className="text-xs text-muted-foreground">Overtime, warnings &amp; corrections</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </PageTransition>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accentClass,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sublabel: string;
  accentClass: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div className={`flex size-8 items-center justify-center rounded-lg ${accentClass}`}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

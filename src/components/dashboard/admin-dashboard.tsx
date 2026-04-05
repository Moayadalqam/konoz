"use client";

import Link from "next/link";
import {
  Users,
  Clock,
  AlertTriangle,
  BarChart3,
  Shield,
  ChevronRight,
  Timer,
} from "lucide-react";
import type { Profile } from "@/lib/auth/types";
import type { AttendanceStats } from "@/actions/attendance-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/transitions/page-transition";

interface AdminDashboardProps {
  profile: Profile;
  pendingCount: number;
  attendanceStats: AttendanceStats;
}

export function AdminDashboard({ profile, pendingCount, attendanceStats }: AdminDashboardProps) {
  const firstName = profile.full_name.split(" ")[0];

  return (
    <PageTransition className="w-full px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System overview and administration
        </p>
      </div>

      {/* Pending approvals alert */}
      {pendingCount > 0 && (
        <Link href="/admin/users?status=pending" className="group block mb-6">
          <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-4 transition-colors group-hover:border-amber-300 group-hover:bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 dark:group-hover:border-amber-700/60">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {pendingCount} pending {pendingCount === 1 ? "approval" : "approvals"}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Review and approve new user registrations
              </p>
            </div>
            <ChevronRight className="size-5 text-amber-400 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={String(attendanceStats.totalEmployees)}
          sublabel="Active employees"
        />
        <StatCard
          icon={Clock}
          label="Present Today"
          value={String(attendanceStats.presentToday)}
          sublabel="Clocked in"
        />
        <StatCard
          icon={BarChart3}
          label="Absent Today"
          value={String(attendanceStats.absentToday)}
          sublabel="Not clocked in"
        />
        <StatCard
          icon={AlertTriangle}
          label="Late Today"
          value={String(attendanceStats.lateToday)}
          sublabel="Late arrivals"
        />
        <StatCard
          icon={Timer}
          label="Overtime (Week)"
          value={`${Math.round(attendanceStats.overtimeThisWeek / 60)}h`}
          sublabel={`${attendanceStats.overtimeThisWeek} minutes`}
        />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" render={<Link href="/dashboard/locations" />}>
            <BarChart3 className="size-4" />
            View Locations
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/admin/users" />}>
            <Shield className="size-4" />
            Manage Users
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <Icon className="size-4 text-muted-foreground/60" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

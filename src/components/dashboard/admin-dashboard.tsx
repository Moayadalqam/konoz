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

      {/* Hero stats — actionable, time-sensitive */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Present Today
            </p>
            <Clock className="size-5 text-emerald-500/60 dark:text-emerald-400/50" />
          </div>
          <p className="mt-3 font-heading text-4xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
            {attendanceStats.presentToday}
          </p>
          <p className="mt-1 text-sm text-emerald-600/80 dark:text-emerald-400/70">
            Clocked in today
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/60 p-6 dark:border-red-800/40 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Absent Today
            </p>
            <BarChart3 className="size-5 text-red-500/60 dark:text-red-400/50" />
          </div>
          <p className="mt-3 font-heading text-4xl font-bold tracking-tight text-red-900 dark:text-red-100">
            {attendanceStats.absentToday}
          </p>
          <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/70">
            Not clocked in
          </p>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={String(attendanceStats.totalEmployees)}
          sublabel="Active employees"
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
          <Link
            href="/dashboard/locations"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            <BarChart3 className="size-4" />
            View Locations
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            <Shield className="size-4" />
            Manage Users
          </Link>
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

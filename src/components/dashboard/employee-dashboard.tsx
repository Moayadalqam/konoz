"use client";

import Link from "next/link";
import { Clock, CalendarDays, Timer, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import type { Profile } from "@/lib/auth/types";
import type { TodayStatusResult } from "@/lib/validations/attendance";
import type { EmployeeDashboardStats } from "@/actions/attendance-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { PageTransition } from "@/components/transitions/page-transition";

interface EmployeeDashboardProps {
  profile: Profile;
  todayStatus: TodayStatusResult;
  stats: EmployeeDashboardStats;
}

export function EmployeeDashboard({ profile, todayStatus, stats }: EmployeeDashboardProps) {
  const firstName = profile.full_name.split(" ")[0];

  return (
    <PageTransition className="w-full px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Good morning, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Clock-in CTA — large, centered, prominent */}
      <Card className="mb-8">
        <CardContent className="flex flex-col items-center gap-5 py-10">
          {todayStatus.status === "not_clocked_in" && (
            <>
              <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/10">
                <Clock className="size-10 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Today&apos;s Status
                </p>
                <p className="mt-1 font-heading text-lg font-semibold text-foreground">
                  Not clocked in yet
                </p>
              </div>
              <Link
                href="/dashboard/attendance"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-600 px-10 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <Clock className="size-5" />
                Clock In
              </Link>
            </>
          )}
          {todayStatus.status === "clocked_in" && todayStatus.record && (
            <>
              <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
                <Clock className="size-10 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Clocked in at{" "}
                  {new Date(todayStatus.record.clock_in).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 font-heading text-lg font-semibold text-foreground">
                  Currently working
                </p>
              </div>
              <Link
                href="/dashboard/attendance"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-amber-500 px-10 text-base font-semibold text-white transition-colors hover:bg-amber-600"
              >
                <ArrowRight className="size-5" />
                Go to Attendance
              </Link>
            </>
          )}
          {todayStatus.status === "clocked_out" && todayStatus.record && (
            <>
              <div className="flex size-20 items-center justify-center rounded-full bg-slate-100">
                <CheckCircle2 className="size-10 text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Done for today
                </p>
                <p className="mt-1 font-heading text-lg font-semibold text-foreground">
                  {(() => {
                    const mins = todayStatus.record.total_minutes ?? 0;
                    return `${Math.floor(mins / 60)}h ${mins % 60}m worked`;
                  })()}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="font-heading text-lg font-bold text-foreground">
                {stats.daysThisWeek} / 6 days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <Timer className="size-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hours This Month</p>
              <p className="font-heading text-lg font-bold text-foreground">
                {stats.hoursThisMonth} hrs
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <AlertTriangle className="size-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Late This Month</p>
              <p className="font-heading text-lg font-bold text-foreground">
                {stats.lateThisMonth}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent attendance */}
      <div className="mt-8">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Attendance</CardTitle>
            <Link
              href="/dashboard/attendance"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentRecords.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  No attendance records yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentRecords.map((rec) => {
                  const date = new Date(rec.clock_in);
                  const mins = rec.total_minutes ?? 0;
                  const hours = Math.floor(mins / 60);
                  const m = mins % 60;
                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                          <Clock className="size-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rec.location_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rec.clock_out ? (
                          <span className="text-xs font-medium text-muted-foreground">
                            {hours}h {m}m
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-primary">
                            Working...
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            rec.status === "present"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : rec.status === "late"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rec.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

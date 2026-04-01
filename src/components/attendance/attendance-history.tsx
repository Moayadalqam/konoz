"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyAttendanceAction } from "@/actions/attendance";
import type { AttendanceWithDetails } from "@/lib/validations/attendance";
import { cn } from "@/lib/utils";

export function AttendanceHistory() {
  const [records, setRecords] = useState<AttendanceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: from.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
    };
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync loading state before async fetch
    setLoading(true);
    getMyAttendanceAction({ from: dateRange.from, to: dateRange.to })
      .then((data) => setRecords(data as AttendanceWithDetails[]))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [dateRange]);

  // Summary stats
  const daysPresent = records.filter((r) => r.status === "present" || r.status === "late").length;
  const totalMinutes = records.reduce((sum, r) => sum + (r.total_minutes ?? 0), 0);
  const totalHours = Math.round(totalMinutes / 60);
  const avgHours = daysPresent > 0 ? (totalMinutes / daysPresent / 60).toFixed(1) : "0";

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const formatDuration = (mins: number | null) => {
    if (!mins) return "--";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    present: { label: "Present", className: "bg-emerald-500/10 text-emerald-600" },
    late: { label: "Late", className: "bg-amber-500/10 text-amber-600" },
    absent: { label: "Absent", className: "bg-red-500/10 text-red-600" },
    early_departure: { label: "Early", className: "bg-amber-500/10 text-amber-600" },
    on_leave: { label: "Leave", className: "bg-blue-500/10 text-blue-600" },
  };

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <p className="font-heading text-2xl font-bold text-foreground">{daysPresent}</p>
            <p className="text-xs text-muted-foreground">Days Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <p className="font-heading text-2xl font-bold text-foreground">{totalHours}h</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <p className="font-heading text-2xl font-bold text-foreground">{avgHours}h</p>
            <p className="text-xs text-muted-foreground">Avg/Day</p>
          </CardContent>
        </Card>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Attendance History ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No attendance records found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {records.map((record) => {
                const status = statusConfig[record.status] ?? statusConfig.present;
                return (
                  <div key={record.id} className="px-4 py-3 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {formatDate(record.clock_in)}
                          </p>
                          <Badge variant="secondary" className={cn("text-[10px]", status.className)}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatTime(record.clock_in)}
                            {record.clock_out && ` - ${formatTime(record.clock_out)}`}
                          </span>
                          {record.locations && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {record.locations.name}
                              {record.shifts?.name && (
                                <span className="text-muted-foreground/70">
                                  &middot; {record.shifts.name}
                                </span>
                              )}
                            </span>
                          )}
                          {record.clock_in_method === "supervisor_batch" && (
                            <span className="text-[10px] text-muted-foreground/60">(batch)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <p className="text-sm font-medium tabular-nums text-foreground">
                          {formatDuration(record.total_minutes)}
                        </p>
                        {record.is_overtime && record.overtime_minutes > 0 && (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 text-[10px] px-1.5 py-0">
                            OT {record.overtime_minutes}m
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useTransition, useCallback } from "react";
import {
  MapPin,
  Clock,
  Users,
  UserCheck,
  LogOut,
  MoreHorizontal,
  StickyNote,
  AlertTriangle,
  CalendarDays,
  Camera,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { SiteEmployeeAttendance } from "@/lib/validations/attendance";
import { batchClockOutAction } from "@/actions/supervisor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BatchClockInDialog } from "./batch-clock-in-dialog";
import { AttendanceNoteDialog } from "./attendance-note-dialog";

interface SupervisorAttendanceProps {
  employees: SiteEmployeeAttendance[];
  locationName: string;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function getElapsedMinutes(clockIn: string): number {
  return Math.round((Date.now() - new Date(clockIn).getTime()) / 60000);
}

const STATUS_CONFIG = {
  checked_in: {
    dot: "bg-emerald-500",
    ringColor: "ring-emerald-500/20",
    label: "Checked In",
    textColor: "text-emerald-700 dark:text-emerald-400",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  checked_out: {
    dot: "bg-blue-500",
    ringColor: "ring-blue-500/20",
    label: "Checked Out",
    textColor: "text-blue-700 dark:text-blue-400",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40",
  },
  not_yet: {
    dot: "bg-slate-300 dark:bg-slate-600",
    ringColor: "ring-slate-300/20",
    label: "Not Yet",
    textColor: "text-slate-500 dark:text-slate-400",
    badgeBg: "bg-slate-50 dark:bg-slate-900/40",
  },
} as const;

export function SupervisorAttendance({
  employees,
  locationName,
}: SupervisorAttendanceProps) {
  const [isClockInOpen, setIsClockInOpen] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; name: string } | null>(null);
  const [noteTarget, setNoteTarget] = useState<{
    attendanceId: string;
    employeeName: string;
    currentNotes?: string | null;
    mode: "note" | "flag";
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const checkedInEmployees = employees.filter((e) => e.status === "checked_in");
  const checkedOutEmployees = employees.filter(
    (e) => e.status === "checked_out"
  );
  const notYetEmployees = employees.filter((e) => e.status === "not_yet");
  const presentCount =
    checkedInEmployees.length + checkedOutEmployees.length;
  const totalCount = employees.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const handleBatchClockOut = useCallback(() => {
    const ids = checkedInEmployees.map((e) => e.employee_id);
    if (ids.length === 0) return;

    startTransition(async () => {
      try {
        const result = await batchClockOutAction(ids);
        toast.success(
          `Clocked out ${result.count} employee${result.count !== 1 ? "s" : ""}`
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to clock out employees"
        );
      }
    });
  }, [checkedInEmployees]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Site Attendance
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" />
              {locationName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {today}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => setIsClockInOpen(true)}
            disabled={notYetEmployees.length === 0}
          >
            <UserCheck className="size-4" />
            Batch Clock In
          </Button>
          {checkedInEmployees.length > 0 && (
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={handleBatchClockOut}
              disabled={isPending}
            >
              <LogOut className="size-4" />
              Clock Out All ({checkedInEmployees.length})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
              <p className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {presentCount}
                <span className="text-lg font-normal text-muted-foreground">
                  {" "}
                  / {totalCount}
                </span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-1 items-center gap-4 sm:max-w-xs">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${percentage}%`,
                  backgroundColor:
                    percentage >= 80
                      ? "var(--color-success)"
                      : percentage >= 50
                        ? "var(--color-warning)"
                        : "var(--color-destructive)",
                }}
              />
            </div>
            <span
              className="font-heading text-sm font-semibold tabular-nums"
              style={{
                color:
                  percentage >= 80
                    ? "var(--color-success)"
                    : percentage >= 50
                      ? "var(--color-warning)"
                      : "var(--color-destructive)",
              }}
            >
              {percentage}%
            </span>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="mt-4 flex flex-wrap gap-6 border-t border-border pt-4 text-sm">
          <StatusCount
            dot="bg-emerald-500"
            label="Checked In"
            count={checkedInEmployees.length}
          />
          <StatusCount
            dot="bg-blue-500"
            label="Checked Out"
            count={checkedOutEmployees.length}
          />
          <StatusCount
            dot="bg-slate-300 dark:bg-slate-600"
            label="Not Yet"
            count={notYetEmployees.length}
          />
        </div>
      </div>

      {/* Employee Table -- hidden on mobile, cards shown instead */}
      {employees.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
          <div className="text-center">
            <Users className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              No employees assigned to this location
            </p>
          </div>
        </div>
      ) : (
        <div className="hidden overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5 sm:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[35%] pl-4">Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="hidden md:table-cell">Photo</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead className="w-12 pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp, i) => {
                const config = STATUS_CONFIG[emp.status];
                const hasNotes =
                  emp.notes && emp.notes.length > 0;
                const isFlagged = emp.notes?.startsWith("[ANOMALY]");

                return (
                  <TableRow
                    key={emp.employee_id}
                    className={
                      i % 2 === 0
                        ? "bg-transparent"
                        : "bg-muted/20"
                    }
                  >
                    {/* Employee info */}
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`size-2.5 shrink-0 rounded-full ${config.dot} ring-2 ${config.ringColor}`}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {emp.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emp.employee_number}
                          </p>
                        </div>
                        {isFlagged && (
                          <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                        )}
                        {hasNotes && !isFlagged && (
                          <StickyNote className="size-3 shrink-0 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeBg} ${config.textColor}`}
                        >
                          {config.label}
                        </span>
                        {emp.attendance_status === "late" && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                            Late
                          </span>
                        )}
                        {emp.attendance_status === "early_departure" && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                            Early
                          </span>
                        )}
                        {emp.is_overtime && (
                          <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                            OT
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Time details */}
                    <TableCell>
                      {emp.status === "checked_in" && emp.clock_in && (
                        <div>
                          <p className="text-sm text-foreground">
                            {formatTime(emp.clock_in)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(getElapsedMinutes(emp.clock_in))} elapsed
                          </p>
                          {emp.shift_name && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              {emp.shift_name}
                            </p>
                          )}
                        </div>
                      )}
                      {emp.status === "checked_out" && emp.clock_in && (
                        <div>
                          <p className="text-sm text-foreground">
                            {formatTime(emp.clock_in)}
                            {emp.clock_out && (
                              <span className="text-muted-foreground">
                                {" "}
                                - {formatTime(emp.clock_out)}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(emp.total_minutes)}
                            </p>
                            {emp.is_overtime && emp.overtime_minutes && emp.overtime_minutes > 0 && (
                              <span className="text-[10px] font-medium text-purple-600">
                                +{emp.overtime_minutes}m OT
                              </span>
                            )}
                          </div>
                          {emp.shift_name && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              {emp.shift_name}
                            </p>
                          )}
                        </div>
                      )}
                      {emp.status === "not_yet" && (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>

                    {/* Photo */}
                    <TableCell className="hidden md:table-cell">
                      {emp.clock_in_photo_url ? (
                        <button
                          onClick={() => setEnlargedPhoto({ url: emp.clock_in_photo_url!, name: emp.full_name })}
                          className="group relative size-10 overflow-hidden rounded-lg border border-border transition-all hover:ring-2 hover:ring-primary/40"
                        >
                          <img
                            src={emp.clock_in_photo_url}
                            alt={`${emp.full_name} check-in`}
                            className="size-full object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                            <Camera className="size-3.5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>

                    {/* Location (GPS) */}
                    <TableCell className="hidden md:table-cell">
                      {emp.clock_in_lat && emp.clock_in_lng ? (
                        <a
                          href={`https://www.google.com/maps?q=${emp.clock_in_lat},${emp.clock_in_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <MapPin className="size-3" />
                          View Map
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>

                    {/* Method */}
                    <TableCell className="hidden md:table-cell">
                      {emp.clock_in_method ? (
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {emp.clock_in_method === "supervisor_batch"
                            ? "Batch"
                            : emp.clock_in_method === "manual_correction"
                              ? "Manual"
                              : "Self"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-4 text-right">
                      {emp.attendance_id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem
                              onClick={() =>
                                setNoteTarget({
                                  attendanceId: emp.attendance_id!,
                                  employeeName: emp.full_name,
                                  currentNotes: emp.notes,
                                  mode: "note",
                                })
                              }
                            >
                              <StickyNote className="size-4" />
                              Add Note
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setNoteTarget({
                                  attendanceId: emp.attendance_id!,
                                  employeeName: emp.full_name,
                                  currentNotes: emp.notes,
                                  mode: "flag",
                                })
                              }
                            >
                              <AlertTriangle className="size-4" />
                              Flag Anomaly
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile cards -- shown below sm breakpoint */}
      {employees.length > 0 && (
        <div className="space-y-2 sm:hidden">
          {employees.map((emp) => {
            const config = STATUS_CONFIG[emp.status];
            return (
              <div
                key={`mobile-${emp.employee_id}`}
                className="rounded-xl border border-border bg-card p-3 ring-1 ring-foreground/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${config.dot} ring-2 ${config.ringColor}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground text-sm">
                        {emp.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.employee_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.badgeBg} ${config.textColor}`}
                    >
                      {config.label}
                    </span>
                    {emp.attendance_status === "late" && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                        Late
                      </span>
                    )}
                    {emp.attendance_status === "early_departure" && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                        Early
                      </span>
                    )}
                    {emp.is_overtime && (
                      <span className="inline-flex items-center rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
                        OT
                      </span>
                    )}
                  </div>
                </div>

                {emp.status !== "not_yet" && emp.clock_in && (
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTime(emp.clock_in)}
                        {emp.status === "checked_out" && emp.clock_out && (
                          <span> - {formatTime(emp.clock_out)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {emp.clock_in_method && (
                          <span className="capitalize">
                            {emp.clock_in_method === "supervisor_batch"
                              ? "Batch"
                              : emp.clock_in_method === "manual_correction"
                                ? "Manual"
                                : "Self"}
                          </span>
                        )}
                        {emp.status === "checked_in" && (
                          <span className="font-medium text-foreground">
                            {formatDuration(getElapsedMinutes(emp.clock_in))}
                          </span>
                        )}
                        {emp.status === "checked_out" && (
                          <span className="font-medium text-foreground">
                            {formatDuration(emp.total_minutes)}
                          </span>
                        )}
                      </div>
                    </div>
                    {emp.shift_name && (
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {emp.shift_name}
                      </p>
                    )}
                    {/* Mobile: photo + location row */}
                    <div className="mt-2 flex items-center gap-3">
                      {emp.clock_in_photo_url && (
                        <button
                          onClick={() => setEnlargedPhoto({ url: emp.clock_in_photo_url!, name: emp.full_name })}
                          className="size-8 overflow-hidden rounded-md border border-border"
                        >
                          <img src={emp.clock_in_photo_url} alt="" className="size-full object-cover" />
                        </button>
                      )}
                      {emp.clock_in_lat && emp.clock_in_lng && (
                        <a
                          href={`https://www.google.com/maps?q=${emp.clock_in_lat},${emp.clock_in_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary"
                        >
                          <MapPin className="size-3" />
                          View Location
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {emp.attendance_id && (
                  <div className="mt-2 flex gap-2 border-t border-border/50 pt-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-xs"
                      onClick={() =>
                        setNoteTarget({
                          attendanceId: emp.attendance_id!,
                          employeeName: emp.full_name,
                          currentNotes: emp.notes,
                          mode: "note",
                        })
                      }
                    >
                      <StickyNote className="size-3" />
                      Note
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-xs"
                      onClick={() =>
                        setNoteTarget({
                          attendanceId: emp.attendance_id!,
                          employeeName: emp.full_name,
                          currentNotes: emp.notes,
                          mode: "flag",
                        })
                      }
                    >
                      <AlertTriangle className="size-3" />
                      Flag
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <BatchClockInDialog
        employees={employees}
        open={isClockInOpen}
        onOpenChange={setIsClockInOpen}
      />

      {noteTarget && (
        <AttendanceNoteDialog
          attendanceId={noteTarget.attendanceId}
          employeeName={noteTarget.employeeName}
          currentNotes={noteTarget.currentNotes}
          initialMode={noteTarget.mode}
          open={true}
          onOpenChange={(open) => {
            if (!open) setNoteTarget(null);
          }}
        />
      )}

      {/* Enlarged photo overlay */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div
            className="relative max-h-[80vh] max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Camera className="size-4 text-primary" />
                {enlargedPhoto.name} — Check-in Photo
              </div>
              <button
                onClick={() => setEnlargedPhoto(null)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <img
              src={enlargedPhoto.url}
              alt={`${enlargedPhoto.name} check-in photo`}
              className="w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCount({
  dot,
  label,
  count,
}: {
  dot: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${dot}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-heading font-semibold tabular-nums text-foreground">
        {count}
      </span>
    </div>
  );
}

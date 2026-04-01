"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, X, Clock, Loader2, Inbox } from "lucide-react";
import {
  getPendingOvertimeAction,
  decideOvertimeAction,
} from "@/actions/hr-actions";
import type { PendingOvertimeRecord } from "@/lib/validations/hr-actions";

function formatOvertimeMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OvertimeApproval() {
  const [records, setRecords] = useState<PendingOvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function fetchRecords() {
    try {
      const data = await getPendingOvertimeAction();
      setRecords(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load overtime records"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecords();
  }, []);

  function handleApprove(attendanceId: string) {
    setProcessingId(attendanceId);
    startTransition(async () => {
      try {
        await decideOvertimeAction({
          attendance_id: attendanceId,
          decision: "approved",
        });
        toast.success("Overtime approved");
        setRecords((prev) => prev.filter((r) => r.id !== attendanceId));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to approve overtime"
        );
      } finally {
        setProcessingId(null);
      }
    });
  }

  function handleReject(attendanceId: string) {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessingId(attendanceId);
    startTransition(async () => {
      try {
        await decideOvertimeAction({
          attendance_id: attendanceId,
          decision: "rejected",
          reason: rejectReason.trim(),
        });
        toast.success("Overtime rejected");
        setRecords((prev) => prev.filter((r) => r.id !== attendanceId));
        setRejectingId(null);
        setRejectReason("");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to reject overtime"
        );
      } finally {
        setProcessingId(null);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading overtime records...
        </span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-5 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          No pending overtime records
        </p>
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          When employees work beyond their shift, overtime records will appear
          here for approval.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          {records.length} pending record{records.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((rec, idx) => (
              <TableRow
                key={rec.id}
                className={idx % 2 === 1 ? "bg-muted/20" : ""}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{rec.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
                      #{rec.employee_number}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(rec.date)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rec.shift_name ?? "--"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span>{formatTime(rec.clock_in)}</span>
                  <span className="mx-1 text-muted-foreground/50">-</span>
                  <span>
                    {rec.clock_out ? formatTime(rec.clock_out) : "ongoing"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    {formatOvertimeMinutes(rec.overtime_minutes)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {rejectingId === rec.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        placeholder="Rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="h-7 w-48 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setRejectingId(null);
                            setRejectReason("");
                          }
                        }}
                      />
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => handleReject(rec.id)}
                        disabled={isPending && processingId === rec.id}
                      >
                        {isPending && processingId === rec.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          "Reject"
                        )}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        onClick={() => handleApprove(rec.id)}
                        disabled={isPending && processingId === rec.id}
                      >
                        {isPending && processingId === rec.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <>
                            <Check
                              data-icon="inline-start"
                              className="size-3"
                            />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => setRejectingId(rec.id)}
                        disabled={isPending}
                      >
                        <X data-icon="inline-start" className="size-3" />
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {records.map((rec) => (
          <div key={rec.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {rec.employee_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{rec.employee_number}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300"
              >
                {formatOvertimeMinutes(rec.overtime_minutes)}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{formatDate(rec.date)}</span>
              {rec.shift_name && <span>{rec.shift_name}</span>}
              <span>
                {formatTime(rec.clock_in)}
                {" - "}
                {rec.clock_out ? formatTime(rec.clock_out) : "ongoing"}
              </span>
            </div>

            {rejectingId === rec.id ? (
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="Rejection reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(rec.id)}
                    disabled={isPending && processingId === rec.id}
                  >
                    {isPending && processingId === rec.id
                      ? "Rejecting..."
                      : "Confirm Reject"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/50 dark:text-emerald-400"
                  onClick={() => handleApprove(rec.id)}
                  disabled={isPending && processingId === rec.id}
                >
                  <Check data-icon="inline-start" className="size-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400"
                  onClick={() => setRejectingId(rec.id)}
                  disabled={isPending}
                >
                  <X data-icon="inline-start" className="size-3.5" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

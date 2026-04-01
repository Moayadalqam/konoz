"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { correctAttendanceAction } from "@/actions/hr-actions";

interface CorrectionRecord {
  id: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  employee_name: string;
}

interface CorrectionDialogProps {
  record: CorrectionRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "early_departure", label: "Early Departure" },
  { value: "absent", label: "Absent" },
  { value: "on_leave", label: "On Leave" },
];

function toDatetimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

export function CorrectionDialog({
  record,
  open,
  onOpenChange,
}: CorrectionDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [clockIn, setClockIn] = useState(toDatetimeLocal(record.clock_in));
  const [clockOut, setClockOut] = useState(
    record.clock_out ? toDatetimeLocal(record.clock_out) : ""
  );
  const [status, setStatus] = useState(record.status);
  const [reason, setReason] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("A reason is required for corrections");
      return;
    }

    startTransition(async () => {
      try {
        await correctAttendanceAction({
          attendance_id: record.id,
          clock_in: clockIn ? new Date(clockIn).toISOString() : undefined,
          clock_out: clockOut ? new Date(clockOut).toISOString() : undefined,
          status: status as
            | "present"
            | "late"
            | "early_departure"
            | "absent"
            | "on_leave",
          reason: reason.trim(),
        });
        toast.success("Attendance record corrected");
        setReason("");
        onOpenChange(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to correct record"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" />
            Correct Attendance
          </DialogTitle>
          <DialogDescription>
            Editing record for{" "}
            <span className="font-medium text-foreground">
              {record.employee_name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="correction-clock-in">Clock In</Label>
              <Input
                id="correction-clock-in"
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correction-clock-out">Clock Out</Label>
              <Input
                id="correction-clock-out"
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v ?? record.status)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="correction-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="correction-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this record being corrected?"
              rows={3}
              required
              className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Correction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

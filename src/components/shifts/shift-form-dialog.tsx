"use client";

import { useState, useEffect, useTransition } from "react";
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
import { toast } from "sonner";
import { createShiftAction, updateShiftAction } from "@/actions/shifts";
import { shiftSchema } from "@/lib/validations/shift";
import type { ShiftWithAssignmentCount } from "@/lib/validations/shift";

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: ShiftWithAssignmentCount | null;
  onSuccess?: () => void;
}

export function ShiftFormDialog({
  open,
  onOpenChange,
  shift,
  onSuccess,
}: ShiftFormDialogProps) {
  const isEdit = !!shift;
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakDuration, setBreakDuration] = useState("60");
  const [gracePeriod, setGracePeriod] = useState("15");

  // Reset form when dialog opens/shift changes
  useEffect(() => {
    if (open) {
      if (shift) {
        setName(shift.name);
        // start_time might be "HH:MM:SS" from DB, trim to "HH:MM"
        setStartTime(shift.start_time.slice(0, 5));
        setEndTime(shift.end_time.slice(0, 5));
        setBreakDuration(String(shift.break_duration_minutes));
        setGracePeriod(String(shift.grace_period_minutes));
      } else {
        setName("");
        setStartTime("08:00");
        setEndTime("17:00");
        setBreakDuration("60");
        setGracePeriod("15");
      }
      setErrors({});
    }
  }, [open, shift]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const data = {
      name,
      start_time: startTime,
      end_time: endTime,
      break_duration_minutes: Number(breakDuration),
      grace_period_minutes: Number(gracePeriod),
      is_active: true,
    };

    const parsed = shiftSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && shift) {
          await updateShiftAction(shift.id, parsed.data);
          toast.success("Shift updated");
        } else {
          await createShiftAction(parsed.data);
          toast.success("Shift created");
        }
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Shift" : "Create Shift"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the shift template details."
              : "Define a new shift template with work hours and break rules."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shift Name */}
          <div className="space-y-2">
            <Label htmlFor="shift-name">Shift Name *</Label>
            <Input
              id="shift-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Morning Shift"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Time inputs */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shift-start">Start Time *</Label>
              <Input
                id="shift-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="font-mono"
              />
              {errors.start_time && (
                <p className="text-xs text-destructive">{errors.start_time}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">End Time *</Label>
              <Input
                id="shift-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="font-mono"
              />
              {errors.end_time && (
                <p className="text-xs text-destructive">{errors.end_time}</p>
              )}
            </div>
          </div>

          {/* Duration inputs */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shift-break">Break (minutes)</Label>
              <Input
                id="shift-break"
                type="number"
                min={0}
                max={480}
                value={breakDuration}
                onChange={(e) => setBreakDuration(e.target.value)}
                placeholder="60"
              />
              {errors.break_duration_minutes && (
                <p className="text-xs text-destructive">
                  {errors.break_duration_minutes}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-grace">Grace (minutes)</Label>
              <Input
                id="shift-grace"
                type="number"
                min={0}
                max={120}
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
                placeholder="15"
              />
              {errors.grace_period_minutes && (
                <p className="text-xs text-destructive">
                  {errors.grace_period_minutes}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Shift"
                  : "Create Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

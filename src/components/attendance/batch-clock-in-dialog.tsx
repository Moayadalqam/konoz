"use client";

import { useState, useTransition, useCallback } from "react";
import {
  MapPin,
  Loader2,
  UserCheck,
  CheckSquare,
  Square,
  MinusSquare,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import type { SiteEmployeeAttendance } from "@/lib/validations/attendance";
import { batchClockInAction } from "@/actions/supervisor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GpsStatus } from "./gps-status";

interface BatchClockInDialogProps {
  employees: SiteEmployeeAttendance[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GpsState =
  | { status: "idle" }
  | { status: "acquiring" }
  | { status: "acquired"; coords: GeolocationCoordinates }
  | { status: "error"; message: string };

export function BatchClockInDialog({
  employees,
  open,
  onOpenChange,
}: BatchClockInDialogProps) {
  const eligible = employees.filter((e) => e.status === "not_yet");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [gps, setGps] = useState<GpsState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allSelected = selected.size === eligible.length && eligible.length > 0;
  const someSelected =
    selected.size > 0 && selected.size < eligible.length;

  const toggleEmployee = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible.map((e) => e.employee_id)));
    }
  }, [allSelected, eligible]);

  const handleSubmit = useCallback(() => {
    if (selected.size === 0) return;
    setError(null);
    setGps({ status: "acquiring" });

    if (!navigator.geolocation) {
      setGps({ status: "error", message: "Geolocation is not supported by your browser" });
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGps({ status: "acquired", coords: position.coords });

        startTransition(async () => {
          try {
            const result = await batchClockInAction({
              employee_ids: Array.from(selected),
              latitude,
              longitude,
              accuracy: accuracy ?? undefined,
              notes: notes.trim() || undefined,
            });

            let message = `Clocked in ${result.count} employee${result.count !== 1 ? "s" : ""}`;
            if (result.skipped > 0) {
              message += ` (${result.skipped} already clocked in)`;
            }
            toast.success(message);
            onOpenChange(false);

            // Reset state
            setSelected(new Set());
            setNotes("");
            setGps({ status: "idle" });
            setError(null);
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "Failed to clock in employees";
            setError(msg);
            toast.error(msg);
          }
        });
      },
      (geoError) => {
        let message = "Unable to get location";
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            message = "Location access denied. Please enable location permissions.";
            break;
          case geoError.POSITION_UNAVAILABLE:
            message = "Location unavailable. Please try again.";
            break;
          case geoError.TIMEOUT:
            message = "Location request timed out. Please try again.";
            break;
        }
        setGps({ status: "error", message });
        setError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [selected, notes, onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSelected(new Set());
        setNotes("");
        setGps({ status: "idle" });
        setError(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Clock In</DialogTitle>
          <DialogDescription>
            Select employees to clock in at your current location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Select All */}
          {eligible.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              {allSelected ? (
                <CheckSquare className="size-4 text-primary" />
              ) : someSelected ? (
                <MinusSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4 text-muted-foreground" />
              )}
              Select All ({eligible.length})
            </button>
          )}

          {/* Employee list */}
          <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-border">
            {eligible.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                All employees are already clocked in
              </div>
            ) : (
              eligible.map((emp) => {
                const isChecked = selected.has(emp.employee_id);
                return (
                  <button
                    key={emp.employee_id}
                    type="button"
                    onClick={() => toggleEmployee(emp.employee_id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                      isChecked ? "bg-primary/5" : ""
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="size-4 shrink-0 text-primary" />
                    ) : (
                      <Square className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {emp.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.employee_number}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="batch-notes"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Notes{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <textarea
              id="batch-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Morning shift start"
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* GPS Status */}
          {gps.status === "acquiring" && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
              <Loader2 className="size-4 animate-spin" />
              Acquiring GPS location...
            </div>
          )}
          {gps.status === "acquired" && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Navigation className="size-4" />
              <span>Location acquired</span>
              <GpsStatus accuracy={gps.coords.accuracy} className="ml-auto" />
            </div>
          )}
          {gps.status === "error" && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <MapPin className="size-4" />
              {gps.message}
            </div>
          )}

          {/* Error */}
          {error && gps.status !== "error" && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={
              selected.size === 0 ||
              isPending ||
              gps.status === "acquiring"
            }
            className="w-full gap-2 sm:w-auto"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserCheck className="size-4" />
            )}
            {isPending
              ? "Clocking In..."
              : gps.status === "acquiring"
                ? "Getting Location..."
                : `Clock In ${selected.size} Employee${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AttendanceRecord } from "@/lib/validations/attendance";

interface AttendanceStatusProps {
  record: AttendanceRecord;
  locationName?: string;
  className?: string;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function useLiveDuration(clockInTime: string, isActive: boolean) {
  const [elapsed, setElapsed] = useState(0);

  // Compute elapsed time after hydration to avoid SSR/client mismatch
  useEffect(() => {
    const compute = () => {
      const diff = Date.now() - new Date(clockInTime).getTime();
      setElapsed(Math.max(0, Math.floor(diff / 1000)));
    };

    compute();
    if (!isActive) return;

    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [clockInTime, isActive]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
    totalMinutes: Math.floor(elapsed / 60),
  };
}

function GeofenceIndicator({ within }: { within: boolean | null }) {
  if (within === null) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
        within
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-amber-500/10 text-amber-600"
      )}
    >
      <MapPin className="size-3" />
      {within ? "Within geofence" : "Outside geofence"}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "clocked_in" | "clocked_out" | "present";
}) {
  const config = {
    clocked_in: {
      label: "Clocked In",
      className: "bg-emerald-500/10 text-emerald-600",
    },
    clocked_out: {
      label: "Clocked Out",
      className: "bg-slate-100 text-slate-600",
    },
    present: {
      label: "Present",
      className: "bg-emerald-500/10 text-emerald-600",
    },
  }[status];

  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function AttendanceStatus({
  record,
  locationName,
  className,
}: AttendanceStatusProps) {
  const isClockedIn = !record.clock_out;
  const duration = useLiveDuration(record.clock_in, isClockedIn);

  const displayStatus = isClockedIn ? "clocked_in" : "clocked_out";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Status + location row */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={displayStatus} />
        <GeofenceIndicator within={record.clock_in_within_geofence} />
      </div>

      {/* Location */}
      {locationName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span>{locationName}</span>
        </div>
      )}

      {/* Clock-in time */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-3.5 shrink-0" />
        <span>
          Clocked in at{" "}
          <span className="font-medium text-foreground">
            {formatTime(record.clock_in)}
          </span>
        </span>
      </div>

      {/* Duration */}
      <div className="flex flex-col items-center gap-1 py-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {isClockedIn ? "Current Duration" : "Total Duration"}
        </p>
        <p
          className={cn(
            "font-heading text-4xl font-bold tabular-nums tracking-tight sm:text-5xl",
            isClockedIn ? "text-emerald-600" : "text-foreground"
          )}
        >
          {isClockedIn
            ? duration.formatted
            : (() => {
                const total = record.total_minutes ?? 0;
                const h = Math.floor(total / 60);
                const m = total % 60;
                return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
              })()}
        </p>
      </div>

      {/* Clock-out time if done */}
      {record.clock_out && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-3.5 shrink-0 text-slate-400" />
          <span>
            Clocked out at{" "}
            <span className="font-medium text-foreground">
              {formatTime(record.clock_out)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

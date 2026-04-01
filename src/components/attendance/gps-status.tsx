"use client";

import { cn } from "@/lib/utils";

interface GpsStatusProps {
  accuracy: number | null;
  className?: string;
}

export function GpsStatus({ accuracy, className }: GpsStatusProps) {
  if (accuracy === null) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", className)}>
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="text-slate-500">GPS unavailable</span>
      </div>
    );
  }

  const level =
    accuracy < 50 ? "good" : accuracy < 200 ? "moderate" : "poor";

  const config = {
    good: { dot: "bg-emerald-500", text: "text-emerald-600", label: "Accurate" },
    moderate: { dot: "bg-amber-500", text: "text-amber-600", label: "Moderate" },
    poor: { dot: "bg-red-500", text: "text-red-600", label: "Poor" },
  }[level];

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <span className={cn("size-2 rounded-full", config.dot)} />
      <span className={config.text}>
        {config.label} ({Math.round(accuracy)}m)
      </span>
    </div>
  );
}

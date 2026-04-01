"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Clock,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { GpsStatus } from "./gps-status";
import { AttendanceStatus } from "./attendance-status";
import {
  attemptClockIn,
  attemptClockOut,
  safeTodayStatus,
  hasPendingOfflineClockIn,
  hasPendingOfflineClockOut,
  type ClockInResult,
  type ClockOutResult,
} from "@/lib/pwa/offline-attendance";
import type { TodayStatusResult } from "@/lib/validations/attendance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Phase =
  | "loading"
  | "idle"
  | "gps"
  | "submitting"
  | "success"
  | "success_offline"
  | "error";

export function ClockInButton() {
  const [todayStatus, setTodayStatus] = useState<TodayStatusResult | null>(
    null
  );
  const [phase, setPhase] = useState<Phase>("loading");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [locationName, setLocationName] = useState<string | null>(null);
  const [outsideGeofence, setOutsideGeofence] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Whether we're doing a clock-out GPS acquisition (vs clock-in)
  const [isClockOutFlow, setIsClockOutFlow] = useState(false);

  // Offline session tracking
  const [offlineSessionId, setOfflineSessionId] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await safeTodayStatus();
      if (status) {
        setTodayStatus(status);
        setIsOfflineMode(false);
      } else {
        // Offline: check IndexedDB for pending actions
        const hasPendingIn = await hasPendingOfflineClockIn();
        const hasPendingOut = await hasPendingOfflineClockOut();
        setIsOfflineMode(true);
        if (hasPendingOut) {
          setTodayStatus({ status: "clocked_out" });
        } else if (hasPendingIn) {
          setTodayStatus({ status: "clocked_in" });
        } else {
          setTodayStatus({ status: "not_clocked_in" });
        }
      }
    } catch {
      // Employee may not have a linked record
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: transition to idle after initial fetch
    fetchStatus().then(() => setPhase("idle"));
  }, [fetchStatus]);

  const getGps = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error("GPS is not supported by your browser")
        );
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });

  const handleClockIn = async () => {
    setPhase("gps");
    setErrorMsg("");
    setIsClockOutFlow(false);

    try {
      const pos = await getGps();
      setGpsAccuracy(pos.coords.accuracy);
      setPhase("submitting");

      startTransition(async () => {
        try {
          const result: ClockInResult = await attemptClockIn({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });

          if (result.offline) {
            // Saved to IndexedDB for later sync
            setOfflineSessionId(result.session_id);
            setPhase("success_offline");
            toast.info("Saved offline — will sync when connected", {
              description: new Date(result.time).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
            });

            await fetchStatus();
            setTimeout(() => {
              setPhase("idle");
            }, 2000);
          } else {
            setLocationName(result.location_name);
            setOutsideGeofence(!result.within_geofence);

            setPhase("success");
            setShowPulse(true);

            if (!result.within_geofence) {
              toast.warning(
                "You clocked in outside your assigned location area"
              );
            } else {
              const time = new Date(result.time).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
              toast.success("Clocked in successfully", {
                description: `${result.location_name} at ${time}`,
              });
            }

            await fetchStatus();
            setTimeout(() => {
              setPhase("idle");
              setShowPulse(false);
            }, 1200);
          }
        } catch (err) {
          setPhase("error");
          setErrorMsg(
            err instanceof Error ? err.message : "Failed to clock in"
          );
        }
      });
    } catch (err) {
      setPhase("error");
      if (err instanceof GeolocationPositionError) {
        const msgs: Record<number, string> = {
          1: "Location permission denied. Please enable GPS in your browser settings.",
          2: "Unable to determine your location. Try moving to an area with better signal.",
          3: "Location request timed out. Please try again.",
        };
        setErrorMsg(msgs[err.code] || "GPS error");
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to acquire GPS position");
      }
    }
  };

  const handleClockOut = async () => {
    // For offline mode without a record, we use the offline session
    const attendanceId = todayStatus?.record?.id || "pending";

    setPhase("gps");
    setErrorMsg("");
    setIsClockOutFlow(true);

    try {
      const pos = await getGps();
      setGpsAccuracy(pos.coords.accuracy);
      setPhase("submitting");

      startTransition(async () => {
        try {
          const result: ClockOutResult = await attemptClockOut(
            {
              attendance_id: attendanceId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
            offlineSessionId ?? undefined
          );

          if (result.offline) {
            toast.info("Clock-out saved offline — will sync when connected");
            await fetchStatus();
            setPhase("idle");
          } else {
            toast.success("Clocked out successfully", {
              description: `Total: ${result.formatted_duration}`,
            });
            await fetchStatus();
            setPhase("idle");
          }
        } catch (err) {
          setPhase("idle");
          const msg =
            err instanceof Error ? err.message : "Failed to clock out";
          setErrorMsg(msg);
          toast.error(msg);
        }
      });
    } catch (err) {
      setPhase("idle");
      if (err instanceof GeolocationPositionError) {
        setErrorMsg("Location permission denied. Please enable GPS.");
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to acquire GPS position");
      }
      toast.error(errorMsg || "GPS acquisition failed");
    }
  };

  // --- Loading skeleton ---
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-16 w-full max-w-xs animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  // --- GPS acquiring / submitting ---
  if (phase === "gps" || phase === "submitting") {
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="size-10 text-primary" />
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              {phase === "gps"
                ? "Getting your location..."
                : "Submitting..."}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/60">
            {isClockOutFlow
              ? "Verifying your position before clocking out"
              : "Please allow location access if prompted"}
          </p>
        </div>
        {gpsAccuracy !== null && (
          <GpsStatus accuracy={gpsAccuracy} className="mt-1" />
        )}
      </div>
    );
  }

  // --- Offline success ---
  if (phase === "success_offline") {
    return (
      <div className="flex flex-col items-center gap-5 py-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex size-20 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="size-10 text-amber-600" />
        </div>
        <p className="text-center font-heading text-lg font-semibold text-foreground">
          Saved offline
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Your clock-in has been saved locally and will sync automatically when
          you&apos;re back online.
        </p>
        {gpsAccuracy !== null && <GpsStatus accuracy={gpsAccuracy} />}
      </div>
    );
  }

  // --- Success flash ---
  if (phase === "success") {
    return (
      <div className="flex flex-col items-center gap-5 py-10 animate-in fade-in zoom-in-95 duration-500">
        <div
          className={cn(
            "flex size-20 items-center justify-center rounded-full bg-emerald-500/10",
            showPulse && "animate-pulse"
          )}
        >
          <CheckCircle2 className="size-10 text-emerald-600" />
        </div>
        <p className="text-center font-heading text-lg font-semibold text-foreground">
          Clocked in
        </p>
        {locationName && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {locationName}
          </div>
        )}
        {gpsAccuracy !== null && <GpsStatus accuracy={gpsAccuracy} />}
      </div>
    );
  }

  // --- Error ---
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="flex size-20 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="size-10 text-red-500" />
        </div>
        <div className="text-center">
          <p className="font-heading text-lg font-semibold text-foreground">
            Something went wrong
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {errorMsg}
          </p>
        </div>
        <button
          onClick={() => {
            setPhase("idle");
            setErrorMsg("");
          }}
          className={cn(
            "h-12 w-full max-w-xs rounded-xl bg-primary text-base font-semibold text-primary-foreground",
            "transition-all duration-200 ease-out",
            "hover:bg-primary/90 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/40"
          )}
        >
          Try Again
        </button>
      </div>
    );
  }

  // --- Not clocked in ---
  if (!todayStatus || todayStatus.status === "not_clocked_in") {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/10">
          <Clock className="size-10 text-emerald-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Ready to start
          </p>
          <p className="mt-1 font-heading text-lg font-semibold text-foreground">
            Tap to clock in
          </p>
        </div>

        {errorMsg && (
          <div className="flex w-full max-w-sm items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-red-600">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleClockIn}
          disabled={isPending}
          className={cn(
            "relative h-16 w-full max-w-xs rounded-xl bg-emerald-600 text-lg font-bold text-white",
            "transition-all duration-200 ease-out",
            "hover:bg-emerald-700 hover:scale-[1.02]",
            "active:scale-[0.98] active:bg-emerald-800",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-500/40",
            "disabled:pointer-events-none disabled:opacity-50",
            "flex items-center justify-center gap-2.5"
          )}
        >
          <Clock className="size-5" />
          Clock In
        </button>
      </div>
    );
  }

  // --- Clocked in (offline mode, no server record) ---
  if (todayStatus.status === "clocked_in" && !todayStatus.record && isOfflineMode) {
    return (
      <div className="flex flex-col items-center gap-5 py-8">
        <div className="flex w-full items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>You&apos;re offline — clock-in pending sync</span>
        </div>

        <div className="flex size-20 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="size-10 text-amber-600" />
        </div>

        <p className="font-heading text-lg font-semibold text-foreground">
          Clocked in (offline)
        </p>

        <button
          onClick={handleClockOut}
          disabled={isPending}
          className={cn(
            "relative h-16 w-full max-w-xs rounded-xl bg-amber-500 text-lg font-bold text-white",
            "transition-all duration-200 ease-out",
            "hover:bg-amber-600 hover:scale-[1.02]",
            "active:scale-[0.98] active:bg-amber-700",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-400/40",
            "disabled:pointer-events-none disabled:opacity-50",
            "flex items-center justify-center gap-2.5"
          )}
        >
          <Clock className="size-5" />
          Clock Out
        </button>
      </div>
    );
  }

  // --- Clocked in: live timer + clock out ---
  if (todayStatus.status === "clocked_in" && todayStatus.record) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-5 py-8",
          showPulse &&
            "animate-in fade-in-0 zoom-in-95 duration-500"
        )}
      >
        {/* Outside geofence warning */}
        {(outsideGeofence ||
          !todayStatus.record.clock_in_within_geofence) && (
          <div className="flex w-full items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>You are outside your assigned location</span>
          </div>
        )}

        {/* Status display with live timer */}
        <AttendanceStatus
          record={todayStatus.record}
          locationName={locationName ?? undefined}
        />

        {/* GPS accuracy from last reading */}
        {gpsAccuracy !== null && (
          <GpsStatus accuracy={gpsAccuracy} className="mt-1" />
        )}

        {/* Clock Out button */}
        <button
          onClick={handleClockOut}
          disabled={isPending}
          className={cn(
            "relative h-16 w-full max-w-xs rounded-xl bg-amber-500 text-lg font-bold text-white",
            "transition-all duration-200 ease-out",
            "hover:bg-amber-600 hover:scale-[1.02]",
            "active:scale-[0.98] active:bg-amber-700",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-400/40",
            "disabled:pointer-events-none disabled:opacity-50",
            "flex items-center justify-center gap-2.5"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Clocking out...
            </>
          ) : (
            <>
              <Clock className="size-5" />
              Clock Out
            </>
          )}
        </button>
      </div>
    );
  }

  // --- Clocked out: done for today ---
  if (todayStatus.status === "clocked_out" && todayStatus.record) {
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="flex size-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <CheckCircle2 className="size-10 text-slate-400" />
        </div>

        <AttendanceStatus
          record={todayStatus.record}
          locationName={locationName ?? undefined}
        />

        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <CheckCircle2 className="size-4" />
          Shift complete
        </div>
      </div>
    );
  }

  return null;
}

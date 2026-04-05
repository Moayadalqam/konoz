import type { Shift } from "@/lib/validations/shift";

/**
 * Parse "HH:MM" or "HH:MM:SS" time string to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Get shift gross duration in minutes (handles cross-midnight).
 * Does NOT subtract break — that's for net calculation.
 */
function getShiftGrossMinutes(startTime: string, endTime: string): number {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (endMin > startMin) {
    return endMin - startMin;
  }
  // Cross-midnight: e.g., 20:00-06:00 = (1440 - 1200) + 360 = 600
  return 1440 - startMin + endMin;
}

/**
 * Get shift net working minutes (gross minus break).
 * Example: 07:00-17:00 with 60min break = 540
 * Example: 20:00-06:00 with 60min break = 540
 */
export function getShiftNetMinutes(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number {
  return getShiftGrossMinutes(startTime, endTime) - breakMinutes;
}

/**
 * Extract time-of-day minutes from a Date object in Saudi timezone.
 */
function dateToMinutesSinceMidnight(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return hour * 60 + minute;
}

/**
 * Check if clock-in is late based on shift start + grace period.
 * Handles cross-midnight shifts where start is in the evening.
 */
function isLate(
  clockInMinutes: number,
  shiftStartMinutes: number,
  graceMinutes: number
): boolean {
  const deadline = shiftStartMinutes + graceMinutes;

  if (deadline < 1440) {
    // Normal: deadline doesn't wrap midnight
    // For cross-midnight shifts (start >= e.g. 20:00), clock-in during evening hours
    // should be compared directly. Clock-in early morning (< shiftStart) means
    // they arrived the next day — that's late.
    if (shiftStartMinutes > 720) {
      // Evening start shift (likely cross-midnight)
      // If clock-in is in the morning (< 12:00), they're in the "next day" portion
      // and definitely late (missed the evening start entirely).
      if (clockInMinutes < shiftStartMinutes - 720) {
        return true;
      }
    }
    return clockInMinutes > deadline;
  }

  // Deadline wraps past midnight (e.g., start 23:50 + grace 15 = 00:05)
  const wrappedDeadline = deadline - 1440;
  // Late if: past deadline same night, OR past wrapped deadline next morning
  // (but not if they arrived early for the shift)
  if (clockInMinutes > deadline) return true; // shouldn't happen (deadline > 1440)
  if (clockInMinutes > shiftStartMinutes) return clockInMinutes > deadline;
  return clockInMinutes > wrappedDeadline;
}

/**
 * Check if clock-out is early departure based on shift end time.
 * Handles cross-midnight shifts.
 */
function isEarly(
  clockOutMinutes: number,
  shiftStartTime: string,
  shiftEndTime: string
): boolean {
  const startMin = timeToMinutes(shiftStartTime);
  const endMin = timeToMinutes(shiftEndTime);
  const isCrossMidnight = endMin <= startMin;

  if (!isCrossMidnight) {
    // Normal shift: early if clock-out before end time
    return clockOutMinutes < endMin;
  }

  // Cross-midnight: end time is next day (e.g., 06:00)
  // If clock-out is after midnight (morning), compare to end
  if (clockOutMinutes < startMin) {
    return clockOutMinutes < endMin;
  }
  // If clock-out is before midnight (evening), they left during the shift — early
  return true;
}

export interface AttendanceStatusResult {
  status: "present" | "late" | "early_departure";
  isOvertime: boolean;
  overtimeMinutes: number;
  totalMinutes: number | null;
}

/**
 * Evaluate attendance status based on shift rules.
 *
 * On clock-in (clockOut = null): only late detection.
 * On clock-out: late + early departure + overtime calculation.
 */
export function evaluateAttendanceStatus(params: {
  clockIn: Date;
  clockOut: Date | null;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: number;
  breakMinutes: number;
}): AttendanceStatusResult {
  const { clockIn, clockOut, shiftStartTime, shiftEndTime, graceMinutes, breakMinutes } =
    params;

  const clockInMinutes = dateToMinutesSinceMidnight(clockIn);
  const shiftStartMin = timeToMinutes(shiftStartTime);

  const lateArrival = isLate(clockInMinutes, shiftStartMin, graceMinutes);

  // No clock-out yet — can only determine lateness
  if (!clockOut) {
    return {
      status: lateArrival ? "late" : "present",
      isOvertime: false,
      overtimeMinutes: 0,
      totalMinutes: null,
    };
  }

  // Calculate total worked minutes
  const totalMinutes = Math.round(
    (clockOut.getTime() - clockIn.getTime()) / 60000
  );

  // Early departure check
  const clockOutMinutes = dateToMinutesSinceMidnight(clockOut);
  const earlyDeparture = isEarly(clockOutMinutes, shiftStartTime, shiftEndTime);

  // Overtime: worked more than shift net duration
  const shiftNetMin = getShiftNetMinutes(shiftStartTime, shiftEndTime, breakMinutes);
  const overtimeMinutes = Math.max(0, totalMinutes - shiftNetMin);
  const isOvertime = overtimeMinutes > 0;

  // Status priority: late > early_departure > present
  let status: "present" | "late" | "early_departure" = "present";
  if (lateArrival) {
    status = "late";
  } else if (earlyDeparture) {
    status = "early_departure";
  }

  return { status, isOvertime, overtimeMinutes, totalMinutes };
}

/**
 * High-level helper: resolve shift and compute status for an attendance record.
 * Used by both individual clock-in/out and supervisor batch actions.
 *
 * Returns null if no shift is assigned (graceful degradation).
 */
export function computeShiftStatus(params: {
  shift: Shift | null;
  clockIn: Date;
  clockOut: Date | null;
}): (AttendanceStatusResult & { shiftId: string }) | null {
  const { shift, clockIn, clockOut } = params;

  if (!shift) return null;

  const result = evaluateAttendanceStatus({
    clockIn,
    clockOut,
    shiftStartTime: shift.start_time,
    shiftEndTime: shift.end_time,
    graceMinutes: shift.grace_period_minutes,
    breakMinutes: shift.break_duration_minutes,
  });

  return { ...result, shiftId: shift.id };
}

const SAUDI_TZ = "Asia/Riyadh";

/** Returns today's date at midnight Saudi time (UTC+3), as a UTC Date. */
export function getTodayStart(): Date {
  const saudiDate = getSaudiDateString();
  const [y, m, d] = saudiDate.split("-").map(Number);
  // Midnight AST = 21:00 previous day UTC (UTC+3 offset)
  return new Date(Date.UTC(y, m - 1, d, -3, 0, 0, 0));
}

/** Returns the current Saudi date as YYYY-MM-DD string. */
export function getSaudiDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SAUDI_TZ });
}

/** Convert a UTC ISO timestamp to Saudi date string (YYYY-MM-DD). */
export function toSaudiDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString("en-CA", { timeZone: SAUDI_TZ });
}

/** Extract time-of-day minutes from a Date in Saudi timezone. */
export function toSaudiMinutesSinceMidnight(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAUDI_TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return hour * 60 + minute;
}

/** Get Saudi-aware week start (Sunday) as UTC Date at Saudi midnight. */
export function getSaudiWeekStart(): Date {
  const saudiDate = getSaudiDateString();
  const [y, m, d] = saudiDate.split("-").map(Number);
  const saudiToday = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = saudiToday.getUTCDay(); // 0=Sun
  saudiToday.setUTCDate(saudiToday.getUTCDate() - dayOfWeek);
  // Convert to Saudi midnight (UTC-3h)
  return new Date(Date.UTC(saudiToday.getUTCFullYear(), saudiToday.getUTCMonth(), saudiToday.getUTCDate(), -3, 0, 0, 0));
}

/** Saudi business day: Sun-Thu. Friday & Saturday = weekend. */
export function isBusinessDay(date: Date): boolean {
  const dayStr = date.toLocaleDateString("en-CA", { timeZone: SAUDI_TZ });
  const [y, m, d] = dayStr.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day !== 5 && day !== 6; // Skip Friday and Saturday
}

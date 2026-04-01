import {
  clockInAction,
  clockOutAction,
  getTodayStatusAction,
} from "@/actions/attendance";
import { saveOfflineAction, getPendingActions } from "./offline-store";
import type {
  ClockInInput,
  ClockOutInput,
  TodayStatusResult,
} from "@/lib/validations/attendance";

function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError && err.message.includes("fetch")) return true;
  if (
    err instanceof Error &&
    (err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError") ||
      err.message.includes("Network request failed") ||
      err.message.includes("Load failed"))
  )
    return true;
  return false;
}

// ── Clock-In ──

export interface OfflineClockInResult {
  offline: true;
  session_id: string;
  time: string;
}

export interface OnlineClockInResult {
  offline: false;
  success: boolean;
  location_name: string;
  within_geofence: boolean;
  time: string;
  shift_id: string | null;
  status: string;
}

export type ClockInResult = OfflineClockInResult | OnlineClockInResult;

export async function attemptClockIn(
  data: ClockInInput
): Promise<ClockInResult> {
  if (!navigator.onLine) {
    return saveClockInOffline(data);
  }

  try {
    const result = await clockInAction(data);
    return { offline: false, ...result };
  } catch (err) {
    if (isNetworkError(err)) {
      return saveClockInOffline(data);
    }
    throw err;
  }
}

async function saveClockInOffline(
  data: ClockInInput
): Promise<OfflineClockInResult> {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();
  await saveOfflineAction("clock_in", { ...data }, sessionId);
  return { offline: true, session_id: sessionId, time: now };
}

// ── Clock-Out ──

export interface OfflineClockOutResult {
  offline: true;
  session_id: string;
}

export type ClockOutResult =
  | OfflineClockOutResult
  | {
      offline: false;
      success: boolean;
      total_minutes: number;
      formatted_duration: string;
      within_geofence: boolean | null;
      status: string;
      is_overtime: boolean;
      overtime_minutes: number;
    };

export async function attemptClockOut(
  data: ClockOutInput,
  sessionId?: string
): Promise<ClockOutResult> {
  if (!navigator.onLine) {
    return saveClockOutOffline(data, sessionId);
  }

  try {
    const result = await clockOutAction(data);
    return { offline: false, ...result };
  } catch (err) {
    if (isNetworkError(err)) {
      return saveClockOutOffline(data, sessionId);
    }
    throw err;
  }
}

async function saveClockOutOffline(
  data: ClockOutInput,
  sessionId?: string
): Promise<OfflineClockOutResult> {
  const sid = sessionId || crypto.randomUUID();
  await saveOfflineAction(
    "clock_out",
    { ...data },
    sid,
    data.attendance_id !== "pending" ? data.attendance_id : undefined
  );
  return { offline: true, session_id: sid };
}

// ── Status helpers ──

export async function safeTodayStatus(): Promise<TodayStatusResult | null> {
  if (!navigator.onLine) return null;
  try {
    return await getTodayStatusAction();
  } catch (err) {
    if (isNetworkError(err)) return null;
    throw err;
  }
}

export async function hasPendingOfflineClockIn(): Promise<boolean> {
  const pending = await getPendingActions();
  const today = new Date().toISOString().split("T")[0];
  return pending.some(
    (a) => a.type === "clock_in" && a.created_at.startsWith(today)
  );
}

export async function hasPendingOfflineClockOut(): Promise<boolean> {
  const pending = await getPendingActions();
  const today = new Date().toISOString().split("T")[0];
  return pending.some(
    (a) => a.type === "clock_out" && a.created_at.startsWith(today)
  );
}

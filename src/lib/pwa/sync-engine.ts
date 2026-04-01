import { clockInAction, clockOutAction } from "@/actions/attendance";
import { getTodayStatusAction } from "@/actions/attendance";
import {
  getPendingActions,
  updateActionStatus,
  patchClockOutAttendanceId,
  clearSyncedActions,
  type OfflineAction,
} from "./offline-store";
import type { ClockInInput } from "@/lib/validations/attendance";

const MAX_ATTEMPTS = 3;

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

export async function syncPendingActions(): Promise<SyncResult> {
  const pending = await getPendingActions();
  if (pending.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;

  // Process in order: clock-ins first, then clock-outs
  const clockIns = pending.filter((a) => a.type === "clock_in");
  const clockOuts = pending.filter((a) => a.type === "clock_out");

  for (const action of clockIns) {
    const success = await syncSingleAction(action);
    if (success) synced++;
    else failed++;
  }

  for (const action of clockOuts) {
    const success = await syncSingleAction(action);
    if (success) synced++;
    else failed++;
  }

  await clearSyncedActions();

  const remaining = (await getPendingActions()).length;
  return { synced, failed, remaining };
}

async function syncSingleAction(action: OfflineAction): Promise<boolean> {
  if (action.attempts >= MAX_ATTEMPTS) {
    return false;
  }

  await updateActionStatus(action.id, "syncing");

  try {
    if (action.type === "clock_in") {
      await clockInAction(action.payload as ClockInInput);
      await updateActionStatus(action.id, "synced");

      // After successful clock-in sync, get the real attendance_id
      // and patch any queued clock-out for this session
      try {
        const status = await getTodayStatusAction();
        if (status.record?.id) {
          await patchClockOutAttendanceId(
            action.session_id,
            status.record.id
          );
        }
      } catch {
        // Non-critical: clock-out will be re-queued if attendance_id missing
      }

      return true;
    }

    if (action.type === "clock_out") {
      if (!action.attendance_id) {
        // Clock-out without attendance_id — clock-in hasn't synced yet
        await updateActionStatus(action.id, "pending");
        return false;
      }
      const payload = action.payload as Record<string, unknown>;
      await clockOutAction({
        attendance_id: action.attendance_id,
        latitude: payload.latitude as number,
        longitude: payload.longitude as number,
        accuracy: payload.accuracy as number | undefined,
      });
      await updateActionStatus(action.id, "synced");
      return true;
    }

    return false;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";

    // Server conflicts: treat as synced (server wins)
    if (
      errMsg.includes("already clocked in") ||
      errMsg.includes("No open clock-in record") ||
      errMsg.includes("duplicate")
    ) {
      await updateActionStatus(action.id, "synced");
      return true;
    }

    await updateActionStatus(action.id, "failed", { error: errMsg });
    return false;
  }
}

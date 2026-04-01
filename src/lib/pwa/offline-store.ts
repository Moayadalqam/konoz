import { openDB, type IDBPDatabase } from "idb";

export interface OfflineAction {
  id: string;
  type: "clock_in" | "clock_out";
  session_id: string;
  payload: Record<string, unknown>;
  attendance_id?: string;
  created_at: string;
  status: "pending" | "syncing" | "synced" | "failed";
  attempts: number;
  error?: string;
}

const DB_NAME = "kunoz-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-actions";

function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-status", "status");
        store.createIndex("by-session", "session_id");
        store.createIndex("by-created", "created_at");
      }
    },
  });
}

export async function saveOfflineAction(
  type: OfflineAction["type"],
  payload: Record<string, unknown>,
  sessionId: string,
  attendanceId?: string
): Promise<OfflineAction> {
  const db = await getDb();
  const action: OfflineAction = {
    id: crypto.randomUUID(),
    type,
    session_id: sessionId,
    payload,
    attendance_id: attendanceId,
    created_at: new Date().toISOString(),
    status: "pending",
    attempts: 0,
  };
  await db.put(STORE_NAME, action);
  return action;
}

export async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  return all
    .filter(
      (a: OfflineAction) => a.status === "pending" || a.status === "failed"
    )
    .sort((a: OfflineAction, b: OfflineAction) =>
      a.created_at.localeCompare(b.created_at)
    );
}

export async function getActionsBySession(
  sessionId: string
): Promise<OfflineAction[]> {
  const db = await getDb();
  const idx = db.transaction(STORE_NAME).store.index("by-session");
  return idx.getAll(sessionId);
}

export async function updateActionStatus(
  id: string,
  status: OfflineAction["status"],
  extra?: { error?: string; attendance_id?: string }
): Promise<void> {
  const db = await getDb();
  const action = await db.get(STORE_NAME, id);
  if (!action) return;
  action.status = status;
  if (status === "failed") action.attempts += 1;
  if (extra?.error) action.error = extra.error;
  if (extra?.attendance_id) action.attendance_id = extra.attendance_id;
  await db.put(STORE_NAME, action);
}

export async function patchClockOutAttendanceId(
  sessionId: string,
  attendanceId: string
): Promise<void> {
  const actions = await getActionsBySession(sessionId);
  const clockOut = actions.find(
    (a: OfflineAction) => a.type === "clock_out" && a.status === "pending"
  );
  if (clockOut) {
    const db = await getDb();
    clockOut.attendance_id = attendanceId;
    await db.put(STORE_NAME, clockOut);
  }
}

export async function clearSyncedActions(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  const tx = db.transaction(STORE_NAME, "readwrite");
  for (const a of all) {
    if (a.status === "synced") await tx.store.delete(a.id);
  }
  await tx.done;
}

export async function getPendingCount(): Promise<number> {
  const actions = await getPendingActions();
  return actions.length;
}

export async function getFailedActions(): Promise<OfflineAction[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  return all.filter((a: OfflineAction) => a.status === "failed");
}

export async function deleteAction(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

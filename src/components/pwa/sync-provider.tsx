"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { syncPendingActions, type SyncResult } from "@/lib/pwa/sync-engine";
import {
  getPendingCount,
  getFailedActions,
  type OfflineAction,
} from "@/lib/pwa/offline-store";
import { notifySyncCompletionAction } from "@/actions/notifications";

interface SyncContextValue {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  failedActions: OfflineAction[];
  triggerSync: () => Promise<void>;
  refreshCounts: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncResult: null,
  failedActions: [],
  triggerSync: async () => {},
  refreshCounts: async () => {},
});

export function useSyncContext() {
  return useContext(SyncContext);
}

const SYNC_INTERVAL = 30_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  // Always initialize to true to avoid hydration mismatch.
  // Node.js v21+ exposes `navigator` but `navigator.onLine` is undefined,
  // causing server/client divergence. The real value is set in useEffect.
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(
    null
  );
  const [failedActions, setFailedActions] = useState<OfflineAction[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncingRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
    const failed = await getFailedActions();
    setFailedActions(failed);
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const result = await syncPendingActions();
      setLastSyncResult(result);
      if (result.synced > 0) {
        void notifySyncCompletionAction(result.synced).catch(() => {});
      }
    } catch {
      // Will retry on next trigger
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshCounts();
    }
  }, [refreshCounts]);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const goOffline = () => setIsOnline(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        triggerSync();
      }
    };
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "TRIGGER_SYNC") triggerSync();
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", onVisibilityChange);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    // Set the real online status now that we're on the client
    setIsOnline(navigator.onLine);

    refreshCounts();
    if (navigator.onLine) triggerSync();

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [triggerSync, refreshCounts]);

  // Periodic sync while pending actions exist
  useEffect(() => {
    if (pendingCount > 0 && isOnline) {
      intervalRef.current = setInterval(triggerSync, SYNC_INTERVAL);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pendingCount, isOnline, triggerSync]);

  return (
    <SyncContext
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        lastSyncResult,
        failedActions,
        triggerSync,
        refreshCounts,
      }}
    >
      {children}
    </SyncContext>
  );
}

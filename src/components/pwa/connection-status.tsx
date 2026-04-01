"use client";

import { useState } from "react";
import { Wifi, WifiOff, Loader2, AlertCircle } from "lucide-react";
import { useSyncContext } from "./sync-provider";
import { FailedSyncDialog } from "./failed-sync-dialog";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
  const { isOnline, pendingCount, isSyncing, failedActions } =
    useSyncContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  const failedCount = failedActions.length;

  // Online, nothing pending — subtle green dot
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return (
      <div className="flex items-center gap-1.5" title="Online">
        <span className="size-2 rounded-full bg-emerald-500" />
      </div>
    );
  }

  // Syncing
  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Loader2 className="size-3.5 animate-spin" />
        <span className="hidden sm:inline">
          Syncing {pendingCount}...
        </span>
      </div>
    );
  }

  // Offline
  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5">
          <WifiOff className="size-3 text-amber-600" />
          <span className="text-xs font-medium text-amber-600">Offline</span>
        </div>
        {pendingCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // Online but has failed actions
  if (failedCount > 0) {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 transition-colors hover:bg-red-500/20"
        >
          <AlertCircle className="size-3 text-red-500" />
          <span className="text-xs font-medium text-red-600">
            {failedCount} failed
          </span>
        </button>
        <FailedSyncDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  // Online with pending (will auto-sync)
  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "size-2 rounded-full bg-blue-500",
            "animate-pulse"
          )}
        />
        <span className="text-xs text-muted-foreground">
          {pendingCount} pending
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" title="Online">
      <Wifi className="size-3.5 text-emerald-500" />
    </div>
  );
}

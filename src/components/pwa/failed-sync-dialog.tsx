"use client";

import { Clock, MapPin, RotateCcw, Trash2, X } from "lucide-react";
import { useSyncContext } from "./sync-provider";
import { updateActionStatus, deleteAction } from "@/lib/pwa/offline-store";
import { cn } from "@/lib/utils";

interface FailedSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FailedSyncDialog({ open, onOpenChange }: FailedSyncDialogProps) {
  const { failedActions, triggerSync, refreshCounts } = useSyncContext();

  if (!open) return null;

  const handleRetry = async (id: string) => {
    await updateActionStatus(id, "pending");
    await refreshCounts();
    await triggerSync();
  };

  const handleRetryAll = async () => {
    for (const action of failedActions) {
      await updateActionStatus(action.id, "pending");
    }
    await refreshCounts();
    await triggerSync();
  };

  const handleDiscard = async (id: string) => {
    if (!confirm("Discard this action? This cannot be undone.")) return;
    await deleteAction(id);
    await refreshCounts();
    if (failedActions.length <= 1) onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-xl bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-foreground">
            Failed Sync Actions
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 transition-colors hover:bg-muted"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {failedActions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No failed actions.
          </p>
        ) : (
          <>
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {failedActions.map((action) => {
                const payload = action.payload as Record<string, unknown>;
                const time = new Date(action.created_at).toLocaleTimeString(
                  "en-US",
                  { hour: "2-digit", minute: "2-digit", hour12: true }
                );
                const date = new Date(action.created_at).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" }
                );

                return (
                  <div
                    key={action.id}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {action.type === "clock_in"
                            ? "Clock In"
                            : "Clock Out"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {date} {time}
                        </span>
                      </div>
                      <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                        Attempt {action.attempts}/{3}
                      </span>
                    </div>

                    {(payload.latitude != null && payload.longitude != null) && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        <span>
                          {(payload.latitude as number).toFixed(4)},{" "}
                          {(payload.longitude as number).toFixed(4)}
                        </span>
                      </div>
                    )}

                    {action.error && (
                      <p className="mt-1.5 text-xs text-red-500 truncate">
                        {action.error}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => handleRetry(action.id)}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                          "bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        )}
                      >
                        <RotateCcw className="size-3" />
                        Retry
                      </button>
                      <button
                        onClick={() => handleDiscard(action.id)}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                          "bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                        )}
                      >
                        <Trash2 className="size-3" />
                        Discard
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {failedActions.length > 1 && (
              <button
                onClick={handleRetryAll}
                className={cn(
                  "mt-4 w-full rounded-lg py-2 text-sm font-semibold",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90 transition-colors"
                )}
              >
                Retry All ({failedActions.length})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

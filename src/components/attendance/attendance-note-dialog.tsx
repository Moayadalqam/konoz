"use client";

import { useState, useTransition, useCallback } from "react";
import { Loader2, StickyNote, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { addAttendanceNoteAction, flagAnomalyAction } from "@/actions/supervisor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AttendanceNoteDialogProps {
  attendanceId: string;
  employeeName: string;
  currentNotes?: string | null;
  initialMode?: "note" | "flag";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceNoteDialog({
  attendanceId,
  employeeName,
  currentNotes,
  initialMode = "note",
  open,
  onOpenChange,
}: AttendanceNoteDialogProps) {
  const [mode, setMode] = useState<"note" | "flag">(initialMode);
  const [noteText, setNoteText] = useState(currentNotes ?? "");
  const [flagReason, setFlagReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAddNote = useCallback(() => {
    if (!noteText.trim()) return;

    startTransition(async () => {
      try {
        await addAttendanceNoteAction({
          attendance_id: attendanceId,
          notes: noteText.trim(),
        });
        toast.success(`Note added for ${employeeName}`);
        onOpenChange(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to add note"
        );
      }
    });
  }, [attendanceId, employeeName, noteText, onOpenChange]);

  const handleFlagAnomaly = useCallback(() => {
    if (!flagReason.trim()) return;

    startTransition(async () => {
      try {
        await flagAnomalyAction(attendanceId, flagReason.trim());
        toast.success(`Anomaly flagged for ${employeeName}`);
        onOpenChange(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to flag anomaly"
        );
      }
    });
  }, [attendanceId, employeeName, flagReason, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "note" ? "Add Note" : "Flag Anomaly"}
          </DialogTitle>
          <DialogDescription>{employeeName}</DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setMode("note")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "note"
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <StickyNote className="size-3.5" />
            Note
          </button>
          <button
            type="button"
            onClick={() => setMode("flag")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "flag"
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="size-3.5" />
            Flag
          </button>
        </div>

        {mode === "note" ? (
          <div>
            <label
              htmlFor="note-input"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Note
            </label>
            <textarea
              id="note-input"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note about this attendance record..."
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {noteText.length}/500
            </p>
          </div>
        ) : (
          <div>
            <label
              htmlFor="flag-reason"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Reason for flagging
            </label>
            <textarea
              id="flag-reason"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Describe the anomaly (e.g., clock-in time inconsistency, absent but marked present...)"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {flagReason.length}/500
            </p>
          </div>
        )}

        <DialogFooter>
          {mode === "note" ? (
            <Button
              onClick={handleAddNote}
              disabled={isPending || !noteText.trim()}
              className="w-full gap-2 sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <StickyNote className="size-4" />
              )}
              {isPending ? "Saving..." : "Add Note"}
            </Button>
          ) : (
            <Button
              onClick={handleFlagAnomaly}
              disabled={isPending || !flagReason.trim()}
              variant="destructive"
              className="w-full gap-2 sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <AlertTriangle className="size-4" />
              )}
              {isPending ? "Flagging..." : "Flag Anomaly"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

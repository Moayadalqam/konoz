"use client";

import { useTransition } from "react";
import {
  Clock,
  Edit2,
  LinkIcon,
  Power,
  SearchX,
  Timer,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteShiftAction } from "@/actions/shifts";
import { toast } from "sonner";
import type { ShiftWithAssignmentCount } from "@/lib/validations/shift";

interface ShiftListProps {
  shifts: ShiftWithAssignmentCount[];
  onEdit: (shift: ShiftWithAssignmentCount) => void;
  onAssign: (shift: ShiftWithAssignmentCount) => void;
  onRefresh: () => void;
}

function formatTime(time: string): string {
  // Convert "HH:MM" or "HH:MM:SS" to display format
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(display).padStart(2, "0")}:${m} ${suffix}`;
}

// ---- Mobile card -----------------------------------------------------------

function ShiftCard({
  shift,
  onEdit,
  onAssign,
  onDeactivate,
  isDeactivating,
}: {
  shift: ShiftWithAssignmentCount;
  onEdit: () => void;
  onAssign: () => void;
  onDeactivate: () => void;
  isDeactivating: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-card p-4 transition-all hover:border-primary/30 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base font-semibold text-foreground">
            {shift.name}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Clock className="size-3" />
              {formatTime(shift.start_time)}
            </span>
            <span className="text-muted-foreground/40">--</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
              {formatTime(shift.end_time)}
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          Active
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Timer className="size-3" />
          {shift.break_duration_minutes} min break
        </span>
        <span className="inline-flex items-center gap-1">
          {shift.grace_period_minutes} min grace
        </span>
        <Badge variant="secondary" className="text-xs">
          {shift.assignment_count} assignment{shift.assignment_count !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 className="size-3" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onAssign}>
          <LinkIcon className="size-3" />
          Assign
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeactivate}
          disabled={isDeactivating}
        >
          <Power className="size-3" />
          {isDeactivating ? "..." : "Deactivate"}
        </Button>
      </div>
    </div>
  );
}

// ---- Main component --------------------------------------------------------

export function ShiftList({ shifts, onEdit, onAssign, onRefresh }: ShiftListProps) {
  const [isPending, startTransition] = useTransition();

  function handleDeactivate(id: string) {
    startTransition(async () => {
      try {
        await deleteShiftAction(id);
        toast.success("Shift deactivated");
        onRefresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to deactivate shift");
      }
    });
  }

  // ---- Empty state ----
  if (shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-5 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          No shifts defined yet
        </p>
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          Create your first shift template to start scheduling work hours for
          locations and employees.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden rounded-lg border border-slate-200 dark:border-slate-800 md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Break</TableHead>
              <TableHead>Grace</TableHead>
              <TableHead>Assignments</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((shift, idx) => (
              <TableRow
                key={shift.id}
                className={idx % 2 === 1 ? "bg-muted/20" : ""}
              >
                <TableCell className="font-heading font-semibold">
                  {shift.name}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatTime(shift.start_time)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatTime(shift.end_time)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {shift.break_duration_minutes} min
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {shift.grace_period_minutes} min
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {shift.assignment_count}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    Active
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(shift)}
                      title="Edit shift"
                    >
                      <Edit2 className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssign(shift)}
                      title="Assign shift"
                    >
                      <LinkIcon className="size-3.5" />
                      Assign
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeactivate(shift.id)}
                      disabled={isPending}
                      title="Deactivate shift"
                    >
                      <Power className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {shifts.map((shift) => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            onEdit={() => onEdit(shift)}
            onAssign={() => onAssign(shift)}
            onDeactivate={() => handleDeactivate(shift.id)}
            isDeactivating={isPending}
          />
        ))}
      </div>

      {/* Footer count */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        Showing {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  MapPin,
  Trash2,
  User,
} from "lucide-react";
import {
  assignShiftAction,
  removeShiftAssignmentAction,
  getShiftAssignmentsAction,
} from "@/actions/shifts";
import { shiftAssignmentSchema } from "@/lib/validations/shift";
import type {
  ShiftWithAssignmentCount,
  ShiftAssignmentWithDetails,
} from "@/lib/validations/shift";
import type { Location } from "@/lib/validations/location";
import type { Employee } from "@/lib/validations/employee";

type AssignTarget = "location" | "employee";

interface ShiftAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ShiftWithAssignmentCount | null;
  locations: Location[];
  employees: Employee[];
  onSuccess?: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ShiftAssignmentDialog({
  open,
  onOpenChange,
  shift,
  locations,
  employees,
  onSuccess,
}: ShiftAssignmentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [target, setTarget] = useState<AssignTarget>("location");
  const [locationId, setLocationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
  const [effectiveTo, setEffectiveTo] = useState("");

  const [assignments, setAssignments] = useState<ShiftAssignmentWithDetails[]>(
    []
  );
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Load existing assignments when dialog opens
  useEffect(() => {
    if (open && shift) {
      setTarget("location");
      setLocationId("");
      setEmployeeId("");
      setEffectiveFrom(todayISO());
      setEffectiveTo("");
      setErrors({});
      loadAssignments(shift.id);
    }
  }, [open, shift]);

  async function loadAssignments(shiftId: string) {
    setLoadingAssignments(true);
    try {
      const data = await getShiftAssignmentsAction(shiftId);
      setAssignments(data);
    } catch {
      // Silently fail - assignments are supplementary
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shift) return;
    setErrors({});

    const data = {
      shift_id: shift.id,
      location_id: target === "location" ? locationId : undefined,
      employee_id: target === "employee" ? employeeId : undefined,
      effective_from: effectiveFrom,
      effective_to: effectiveTo || undefined,
    };

    const parsed = shiftAssignmentSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as string;
        fieldErrors[path || "_root"] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      try {
        await assignShiftAction(parsed.data);
        toast.success("Shift assigned successfully");
        // Reset form but keep dialog open to allow more assignments
        setLocationId("");
        setEmployeeId("");
        setEffectiveTo("");
        // Reload assignments
        await loadAssignments(shift.id);
        onSuccess?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to assign shift"
        );
      }
    });
  }

  function handleRemove(assignmentId: string) {
    if (!shift) return;

    startRemoveTransition(async () => {
      try {
        await removeShiftAssignmentAction(assignmentId);
        toast.success("Assignment removed");
        await loadAssignments(shift.id);
        onSuccess?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to remove assignment"
        );
      }
    });
  }

  const activeLocations = locations.filter((l) => l.is_active);
  const activeEmployees = employees.filter((e) => e.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Shift</DialogTitle>
          <DialogDescription>
            Assign{" "}
            <span className="font-heading font-semibold text-foreground">
              {shift?.name}
            </span>{" "}
            to a location or employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target toggle */}
          <div className="space-y-2">
            <Label>Assign to</Label>
            <div className="flex rounded-lg border border-input overflow-hidden">
              <button
                type="button"
                onClick={() => setTarget("location")}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  target === "location"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                }`}
              >
                <Building2 className="size-3.5" />
                Location
              </button>
              <button
                type="button"
                onClick={() => setTarget("employee")}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  target === "employee"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                }`}
              >
                <User className="size-3.5" />
                Employee
              </button>
            </div>
          </div>

          {/* Location select */}
          {target === "location" && (
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select value={locationId} onValueChange={(v) => setLocationId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <MapPin className="size-3.5 text-muted-foreground" />
                      {loc.name} -- {loc.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_id && (
                <p className="text-xs text-destructive">{errors.location_id}</p>
              )}
            </div>
          )}

          {/* Employee select */}
          {target === "employee" && (
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <User className="size-3.5 text-muted-foreground" />
                      {emp.full_name} (#{emp.employee_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-xs text-destructive">{errors.employee_id}</p>
              )}
            </div>
          )}

          {/* Date range */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="effective-from">
                <Calendar className="size-3.5" />
                Effective From *
              </Label>
              <Input
                id="effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="font-mono text-xs"
              />
              {errors.effective_from && (
                <p className="text-xs text-destructive">
                  {errors.effective_from}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective-to">
                <Calendar className="size-3.5" />
                Effective To
              </Label>
              <Input
                id="effective-to"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="font-mono text-xs"
              />
              {errors.effective_to && (
                <p className="text-xs text-destructive">
                  {errors.effective_to}
                </p>
              )}
            </div>
          </div>

          {/* Root-level validation error (e.g., "must assign to location OR employee") */}
          {errors._root && (
            <p className="text-xs text-destructive">{errors._root}</p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Assigning..." : "Add Assignment"}
          </Button>
        </form>

        {/* Existing assignments */}
        <Separator />

        <div className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Current Assignments
          </h3>

          {loadingAssignments ? (
            <div className="flex items-center justify-center py-6">
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">
              No assignments yet for this shift.
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Assigned To</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.locations ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="border-primary/20 bg-primary/5 text-primary"
                            >
                              <MapPin className="size-3" />
                              Location
                            </Badge>
                            <span className="text-sm">{a.locations.name}</span>
                          </span>
                        ) : a.employees ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300"
                            >
                              <User className="size-3" />
                              Employee
                            </Badge>
                            <span className="text-sm">
                              {a.employees.full_name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatDate(a.effective_from)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {a.effective_to ? formatDate(a.effective_to) : "Ongoing"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => handleRemove(a.id)}
                          disabled={isRemoving}
                          title="Remove assignment"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

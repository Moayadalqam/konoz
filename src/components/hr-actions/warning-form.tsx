"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, FileWarning, Loader2, Inbox } from "lucide-react";
import {
  createWarningAction,
  getEmployeeWarningsAction,
} from "@/actions/hr-actions";
import type { EmployeeWarning } from "@/lib/validations/hr-actions";

interface WarningFormProps {
  employees: { id: string; full_name: string; employee_number: string }[];
}

const WARNING_TYPES = [
  { value: "verbal", label: "Verbal Warning" },
  { value: "written", label: "Written Warning" },
  { value: "final", label: "Final Warning" },
] as const;

function WarningTypeBadge({
  type,
}: {
  type: EmployeeWarning["warning_type"];
}) {
  const styles: Record<string, string> = {
    verbal:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300",
    written:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/40 dark:text-orange-300",
    final:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300",
  };

  return (
    <Badge variant="outline" className={styles[type]}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WarningForm({ employees }: WarningFormProps) {
  const [isPending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [warningType, setWarningType] = useState<string>("");
  const [description, setDescription] = useState("");

  // Recent warnings
  const [warnings, setWarnings] = useState<EmployeeWarning[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] =
    useState("");

  useEffect(() => {
    if (!selectedEmployeeForHistory) {
      setWarnings([]);
      return;
    }

    setWarningsLoading(true);
    getEmployeeWarningsAction(selectedEmployeeForHistory)
      .then(setWarnings)
      .catch(() => setWarnings([]))
      .finally(() => setWarningsLoading(false));
  }, [selectedEmployeeForHistory]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }
    if (!warningType) {
      toast.error("Select a warning type");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    startTransition(async () => {
      try {
        await createWarningAction({
          employee_id: employeeId,
          warning_type: warningType as "verbal" | "written" | "final",
          description: description.trim(),
          related_attendance_ids: [],
        });
        toast.success("Warning issued successfully");
        setDescription("");
        setWarningType("");
        // Refresh warnings if viewing the same employee
        if (employeeId === selectedEmployeeForHistory) {
          const fresh = await getEmployeeWarningsAction(employeeId);
          setWarnings(fresh);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create warning"
        );
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      {/* Form */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" />
          <h3 className="font-heading text-base font-medium">Issue Warning</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={employeeId}
              onValueChange={(v) => setEmployeeId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}{" "}
                    <span className="text-muted-foreground">
                      #{emp.employee_number}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Warning Type</Label>
            <Select
              value={warningType}
              onValueChange={(v) => setWarningType(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {WARNING_TYPES.map((wt) => (
                  <SelectItem key={wt.value} value={wt.value}>
                    {wt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warning-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="warning-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the reason for this warning..."
              rows={4}
              required
              className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2
                  data-icon="inline-start"
                  className="size-4 animate-spin"
                />
                Submitting...
              </>
            ) : (
              <>
                <FileWarning data-icon="inline-start" className="size-4" />
                Issue Warning
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Warning history */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <FileWarning className="size-4 text-muted-foreground" />
          <h3 className="font-heading text-base font-medium">
            Warning History
          </h3>
        </div>

        <div className="mb-4 space-y-2">
          <Label>View warnings for</Label>
          <Select
            value={selectedEmployeeForHistory}
            onValueChange={(v) => setSelectedEmployeeForHistory(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}{" "}
                  <span className="text-muted-foreground">
                    #{emp.employee_number}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {warningsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading...
            </span>
          </div>
        ) : !selectedEmployeeForHistory ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-10">
            <p className="text-sm text-muted-foreground">
              Select an employee to view their warning history
            </p>
          </div>
        ) : warnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-10">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No warnings on record
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {warnings.map((w) => (
              <div key={w.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <WarningTypeBadge type={w.warning_type} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(w.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {w.description}
                </p>
                {w.issuer_name && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Issued by {w.issuer_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

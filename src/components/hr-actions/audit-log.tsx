"use client";

import { useState, useEffect, Fragment } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { getAuditLogAction } from "@/actions/hr-actions";
import type { HrActionLog } from "@/lib/validations/hr-actions";

const ACTION_TYPE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  correction: {
    label: "Correction",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300",
  },
  overtime_approval: {
    label: "OT Approved",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  overtime_rejection: {
    label: "OT Rejected",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300",
  },
  warning: {
    label: "Warning",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300",
  },
  leave_mark: {
    label: "Leave/Absence",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/50 dark:bg-purple-950/40 dark:text-purple-300",
  },
};

const ALL_ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "correction", label: "Corrections" },
  { value: "overtime_approval", label: "OT Approvals" },
  { value: "overtime_rejection", label: "OT Rejections" },
  { value: "warning", label: "Warnings" },
  { value: "leave_mark", label: "Leave/Absence" },
];

function formatTimestamp(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActionBadge({ actionType }: { actionType: string }) {
  const config = ACTION_TYPE_CONFIG[actionType] ?? {
    label: actionType,
    className: "",
  };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

function DiffView({
  oldValues,
  newValues,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}) {
  if (!oldValues && !newValues) {
    return (
      <p className="text-xs text-muted-foreground italic">No details</p>
    );
  }

  const allKeys = new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]);

  return (
    <div className="space-y-1.5">
      {[...allKeys].map((key) => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="font-medium text-muted-foreground min-w-[100px] shrink-0">
              {key.replace(/_/g, " ")}
            </span>
            {oldVal !== undefined && (
              <span className="text-red-600 dark:text-red-400 line-through">
                {String(oldVal)}
              </span>
            )}
            {oldVal !== undefined && newVal !== undefined && (
              <ArrowRight className="size-3 shrink-0 text-muted-foreground mt-0.5" />
            )}
            {newVal !== undefined && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {String(newVal)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AuditLog() {
  const [logs, setLogs] = useState<HrActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchLogs(actionType?: string) {
    setLoading(true);
    try {
      const filters =
        actionType && actionType !== "all"
          ? { actionType }
          : undefined;
      const data = await getAuditLogAction(filters);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs(filterType);
  }, [filterType]);

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <Label>Filter by action</Label>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ACTION_TYPES.map((at) => (
                <SelectItem key={at.value} value={at.value}>
                  {at.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="size-4" />
          {loading ? "Loading..." : `${logs.length} entries`}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading audit log...
          </span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            No audit entries found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            HR actions will be logged here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, idx) => (
                  <Fragment key={log.id}>
                    <TableRow
                      className={idx % 2 === 1 ? "bg-muted/20" : ""}
                    >
                      <TableCell className="text-muted-foreground text-xs">
                        {formatTimestamp(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <ActionBadge actionType={log.action_type} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.performer_name ?? "Unknown"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {log.reason ?? "--"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            setExpandedId(
                              expandedId === log.id ? null : log.id
                            )
                          }
                        >
                          {expandedId === log.id ? (
                            <>
                              Hide
                              <ChevronUp className="ml-1 size-3" />
                            </>
                          ) : (
                            <>
                              View
                              <ChevronDown className="ml-1 size-3" />
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedId === log.id && (
                      <TableRow key={`${log.id}-details`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <DiffView
                            oldValues={log.old_values}
                            newValues={log.new_values}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <ActionBadge actionType={log.action_type} />
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(log.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium">
                  {log.performer_name ?? "Unknown"}
                </p>
                {log.reason && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {log.reason}
                  </p>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  className="mt-2"
                  onClick={() =>
                    setExpandedId(expandedId === log.id ? null : log.id)
                  }
                >
                  {expandedId === log.id ? "Hide details" : "Show details"}
                  {expandedId === log.id ? (
                    <ChevronUp className="ml-1 size-3" />
                  ) : (
                    <ChevronDown className="ml-1 size-3" />
                  )}
                </Button>
                {expandedId === log.id && (
                  <div className="mt-2 rounded-md bg-muted/30 p-3">
                    <DiffView
                      oldValues={log.old_values}
                      newValues={log.new_values}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

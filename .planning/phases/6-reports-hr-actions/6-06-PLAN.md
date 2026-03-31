---
phase: 6-reports-hr-actions
plan: 06
type: execute
wave: 3
depends_on: ["6-04"]
files_modified:
  - src/components/reports/attendance-correction-dialog.tsx
  - src/components/reports/overtime-approval-panel.tsx
  - src/components/reports/warning-dialog.tsx
  - src/components/reports/leave-dialog.tsx
  - src/components/reports/audit-log-table.tsx
  - src/app/(dashboard)/dashboard/hr-actions/page.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "HR can open a dialog, edit clock-in/clock-out times, and submit a correction with reason"
    - "HR can approve or reject overtime entries from a queue with one click"
    - "HR can issue a warning notice selecting type, employee, and linked attendance records"
    - "HR can mark an employee as on-leave or absent for a specific date with reason"
    - "Audit log table shows all HR actions with performer name, timestamp, and old/new values"
    - "HR Actions page loads at /dashboard/hr-actions with tab navigation"
  artifacts:
    - path: "src/app/(dashboard)/dashboard/hr-actions/page.tsx"
      provides: "HR Actions page route"
      min_lines: 30
    - path: "src/components/reports/attendance-correction-dialog.tsx"
      provides: "Dialog for editing attendance record with reason field"
      min_lines: 80
    - path: "src/components/reports/overtime-approval-panel.tsx"
      provides: "Overtime queue with approve/reject buttons"
      min_lines: 80
    - path: "src/components/reports/warning-dialog.tsx"
      provides: "Warning issuance dialog with type selection"
      min_lines: 80
    - path: "src/components/reports/leave-dialog.tsx"
      provides: "Leave/absence marking dialog"
      min_lines: 60
    - path: "src/components/reports/audit-log-table.tsx"
      provides: "Audit trail table component"
      min_lines: 60
  key_links:
    - from: "src/components/reports/attendance-correction-dialog.tsx"
      to: "src/actions/hr-actions.ts"
      via: "calls correctAttendanceAction"
      pattern: "correctAttendanceAction"
    - from: "src/components/reports/overtime-approval-panel.tsx"
      to: "src/actions/hr-actions.ts"
      via: "calls approveOvertimeAction"
      pattern: "approveOvertimeAction"
    - from: "src/app/(dashboard)/dashboard/hr-actions/page.tsx"
      to: "src/actions/hr-actions.ts"
      via: "server component fetches queue and audit data"
      pattern: "import.*from.*actions/hr-actions"
---

<objective>
Build the HR Actions UI: attendance correction dialog, overtime approval queue, warning issuance dialog, leave/absence marking dialog, and audit log table. Wire everything into an HR Actions page at /dashboard/hr-actions.

Purpose: This is the user-facing layer for HRA-01 through HRA-05. HR officers can perform corrections, approve overtime, issue warnings, mark leave, and review the audit trail.
Output: HR Actions page at /dashboard/hr-actions with 5 tabs (Corrections, Overtime, Warnings, Leave, Audit Log).
</objective>

<execution_context>
@/home/moayadalqam/.claude/qualia-engine/workflows/execute-plan.md
@/home/moayadalqam/.claude/qualia-engine/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/DESIGN.md
@src/actions/hr-actions.ts
@src/lib/validations/hr-actions.ts
@src/lib/validations/attendance.ts
@src/lib/auth/dal.ts
@src/components/ui/dialog.tsx
@src/components/ui/table.tsx
@src/components/ui/badge.tsx
@src/components/ui/select.tsx
@src/components/ui/input.tsx
@src/components/ui/button.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create HR action dialogs (correction, warning, leave)</name>
  <files>
    src/components/reports/attendance-correction-dialog.tsx
    src/components/reports/warning-dialog.tsx
    src/components/reports/leave-dialog.tsx
  </files>
  <action>
Create three dialog components for HR actions.

**1. Attendance Correction Dialog** at `/home/moayadalqam/projects/kunoz/src/components/reports/attendance-correction-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { correctAttendanceAction } from "@/actions/hr-actions";

interface AttendanceCorrectionDialogProps {
  attendanceId: string;
  employeeName: string;
  currentClockIn: string;
  currentClockOut: string | null;
  currentStatus: string;
}

export function AttendanceCorrectionDialog({
  attendanceId,
  employeeName,
  currentClockIn,
  currentClockOut,
  currentStatus,
}: AttendanceCorrectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [clockIn, setClockIn] = useState(currentClockIn ? currentClockIn.slice(0, 16) : "");
  const [clockOut, setClockOut] = useState(currentClockOut ? currentClockOut.slice(0, 16) : "");
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason || reason.length < 5) {
      toast.error("Please provide a reason (at least 5 characters)");
      return;
    }

    startTransition(async () => {
      try {
        await correctAttendanceAction({
          attendance_id: attendanceId,
          clock_in: clockIn ? new Date(clockIn).toISOString() : undefined,
          clock_out: clockOut ? new Date(clockOut).toISOString() : undefined,
          status: status as "present" | "late" | "early_departure" | "absent" | "on_leave",
          reason,
        });
        toast.success("Attendance record corrected");
        setOpen(false);
        setReason("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to correct record");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Pencil className="size-3.5" />
          Correct
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Correct Attendance — {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="corr-clock-in" className="text-xs">Clock In</Label>
              <Input
                id="corr-clock-in"
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="corr-clock-out" className="text-xs">Clock Out</Label>
              <Input
                id="corr-clock-out"
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="early_departure">Early Departure</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="corr-reason" className="text-xs">
              Reason for Correction <span className="text-destructive">*</span>
            </Label>
            <Input
              id="corr-reason"
              placeholder="Explain why this record is being corrected..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : "Save Correction"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**2. Warning Dialog** at `/home/moayadalqam/projects/kunoz/src/components/reports/warning-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { issueWarningAction } from "@/actions/hr-actions";
import { warningTypes, warningTypeLabels, type WarningType } from "@/lib/validations/hr-actions";

interface Employee {
  id: string;
  full_name: string;
  employee_number: string;
}

interface WarningDialogProps {
  employees: Employee[];
  preselectedEmployeeId?: string;
}

export function WarningDialog({ employees, preselectedEmployeeId }: WarningDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId ?? "");
  const [warningType, setWarningType] = useState<WarningType>("excessive_lateness");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }
    if (description.length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }

    startTransition(async () => {
      try {
        await issueWarningAction({
          employee_id: employeeId,
          warning_type: warningType,
          description,
          attendance_record_ids: [],
        });
        toast.success("Warning issued successfully");
        setOpen(false);
        setDescription("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to issue warning");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <AlertTriangle className="size-4" />
          Issue Warning
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue Warning Notice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Warning Type</Label>
            <Select value={warningType} onValueChange={(v) => setWarningType(v as WarningType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {warningTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {warningTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="warn-desc" className="text-xs">
              Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="warn-desc"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe the warning reason in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} variant="destructive">
              {isPending ? "Issuing..." : "Issue Warning"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**3. Leave Dialog** at `/home/moayadalqam/projects/kunoz/src/components/reports/leave-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { markLeaveAction } from "@/actions/hr-actions";
import { leaveReasons, leaveReasonLabels, type LeaveReason } from "@/lib/validations/hr-actions";

interface Employee {
  id: string;
  full_name: string;
  employee_number: string;
}

interface LeaveDialogProps {
  employees: Employee[];
  preselectedEmployeeId?: string;
}

export function LeaveDialog({ employees, preselectedEmployeeId }: LeaveDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"on_leave" | "absent">("on_leave");
  const [leaveReason, setLeaveReason] = useState<LeaveReason>("annual_leave");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }

    startTransition(async () => {
      try {
        await markLeaveAction({
          employee_id: employeeId,
          date,
          status,
          leave_reason: leaveReason,
          notes: notes || undefined,
        });
        toast.success(`Employee marked as ${status === "on_leave" ? "on leave" : "absent"}`);
        setOpen(false);
        setNotes("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to mark leave");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <CalendarOff className="size-4" />
          Mark Leave/Absent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark Leave / Absence</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="leave-date" className="text-xs">Date</Label>
              <Input
                id="leave-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "on_leave" | "absent")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Select value={leaveReason} onValueChange={(v) => setLeaveReason(v as LeaveReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leaveReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {leaveReasonLabels[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-notes" className="text-xs">Notes (optional)</Label>
            <Input
              id="leave-notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -10
```
Expected output: no TypeScript errors.

```bash
ls /home/moayadalqam/projects/kunoz/src/components/reports/attendance-correction-dialog.tsx /home/moayadalqam/projects/kunoz/src/components/reports/warning-dialog.tsx /home/moayadalqam/projects/kunoz/src/components/reports/leave-dialog.tsx 2>&1
```
Expected output: all three files listed without errors.
  </verify>
  <done>Three HR action dialogs compile: correction (clock in/out + status + reason), warning (employee + type + description), leave (employee + date + status + reason)</done>
</task>

<task type="auto">
  <name>Task 2: Create overtime approval panel, audit log, and HR Actions page</name>
  <files>
    src/components/reports/overtime-approval-panel.tsx
    src/components/reports/audit-log-table.tsx
    src/components/reports/hr-actions-page.tsx
    src/app/(dashboard)/dashboard/hr-actions/page.tsx
  </files>
  <action>
Create the overtime approval queue, audit log table, HR Actions client page component, and the route page.

**1. Overtime Approval Panel** at `/home/moayadalqam/projects/kunoz/src/components/reports/overtime-approval-panel.tsx`:

```tsx
"use client";

import { useTransition } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { approveOvertimeAction } from "@/actions/hr-actions";
import type { OvertimeEntry } from "@/lib/validations/hr-actions";

const statusClass: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface OvertimeApprovalPanelProps {
  entries: OvertimeEntry[];
}

export function OvertimeApprovalPanel({ entries }: OvertimeApprovalPanelProps) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (attendanceId: string, action: "approve" | "reject") => {
    startTransition(async () => {
      try {
        await approveOvertimeAction({
          attendance_id: attendanceId,
          action,
        });
        toast.success(`Overtime ${action}d successfully`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to ${action} overtime`);
      }
    });
  };

  const pendingEntries = entries.filter((e) => e.overtime_status === "pending");
  const processedEntries = entries.filter((e) => e.overtime_status !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pending Approval
            {pendingEntries.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
                {pendingEntries.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No overtime entries pending approval
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">OT Minutes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEntries.map((entry, i) => (
                    <TableRow key={entry.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                      <TableCell className="font-mono text-xs">{entry.employee_number}</TableCell>
                      <TableCell className="font-medium">{entry.employee_name}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.location_name}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.date}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-purple-600">
                        {entry.overtime_minutes}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => handleAction(entry.id, "approve")}
                            disabled={isPending}
                          >
                            <Check className="size-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleAction(entry.id, "reject")}
                            disabled={isPending}
                          >
                            <X className="size-3.5" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed history */}
      {processedEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">OT Min</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedEntries.slice(0, 20).map((entry, i) => (
                    <TableRow key={entry.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                      <TableCell className="font-mono text-xs">{entry.employee_number}</TableCell>
                      <TableCell className="font-medium">{entry.employee_name}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.date}</TableCell>
                      <TableCell className="text-right font-mono">{entry.overtime_minutes}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusClass[entry.overtime_status] ?? ""}>
                          {entry.overtime_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**2. Audit Log Table** at `/home/moayadalqam/projects/kunoz/src/components/reports/audit-log-table.tsx`:

```tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HrActionLog } from "@/lib/validations/hr-actions";
import { hrActionTypeLabels } from "@/lib/validations/hr-actions";

const actionColorClass: Record<string, string> = {
  attendance_correction: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  overtime_approval: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  overtime_rejection: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  warning_issued: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  leave_marked: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  absence_marked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface AuditLogTableProps {
  logs: HrActionLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">HR Action Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No HR actions recorded yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, i) => (
                  <TableRow key={log.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell>
                      <Badge variant="secondary" className={actionColorClass[log.action_type] ?? ""}>
                        {hrActionTypeLabels[log.action_type] ?? log.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.performer_name}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {log.reason}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {log.old_values && log.new_values ? (
                        <div className="text-xs font-mono">
                          {Object.keys(log.new_values).slice(0, 3).map((key) => (
                            <div key={key} className="flex gap-1">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="text-red-500 line-through">
                                {String((log.old_values as Record<string, unknown>)?.[key] ?? "—")}
                              </span>
                              <span className="text-emerald-600">
                                {String((log.new_values as Record<string, unknown>)[key])}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**3. HR Actions Page (client component)** at `/home/moayadalqam/projects/kunoz/src/components/reports/hr-actions-page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Timer,
  AlertTriangle,
  CalendarOff,
  ScrollText,
} from "lucide-react";
import { OvertimeApprovalPanel } from "./overtime-approval-panel";
import { AuditLogTable } from "./audit-log-table";
import { WarningDialog } from "./warning-dialog";
import { LeaveDialog } from "./leave-dialog";
import type { OvertimeEntry, HrActionLog, EmployeeWarning } from "@/lib/validations/hr-actions";
import { warningTypeLabels } from "@/lib/validations/hr-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Employee {
  id: string;
  full_name: string;
  employee_number: string;
}

const tabs = [
  { id: "overtime", label: "Overtime Queue", icon: Timer },
  { id: "warnings", label: "Warnings", icon: AlertTriangle },
  { id: "leave", label: "Leave/Absence", icon: CalendarOff },
  { id: "audit", label: "Audit Log", icon: ScrollText },
] as const;

type TabId = (typeof tabs)[number]["id"];

interface HrActionsPageProps {
  employees: Employee[];
  overtimeEntries: OvertimeEntry[];
  warnings: EmployeeWarning[];
  auditLogs: HrActionLog[];
}

export function HrActionsPage({
  employees,
  overtimeEntries,
  warnings,
  auditLogs,
}: HrActionsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overtime");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "gap-1.5 text-xs",
                activeTab === tab.id && "shadow-sm"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {tab.id === "overtime" && overtimeEntries.filter((e) => e.overtime_status === "pending").length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 px-1.5 py-0 text-[10px]">
                  {overtimeEntries.filter((e) => e.overtime_status === "pending").length}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Action buttons for warnings and leave */}
      {(activeTab === "warnings" || activeTab === "leave") && (
        <div className="flex gap-2">
          {activeTab === "warnings" && <WarningDialog employees={employees} />}
          {activeTab === "leave" && <LeaveDialog employees={employees} />}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "overtime" && (
        <OvertimeApprovalPanel entries={overtimeEntries} />
      )}
      {activeTab === "warnings" && (
        <WarningsTable warnings={warnings} />
      )}
      {activeTab === "leave" && (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Use the "Mark Leave/Absent" button above to record leave or absence for any employee.
              Leave and absence records appear in the Daily Attendance report.
            </p>
          </CardContent>
        </Card>
      )}
      {activeTab === "audit" && <AuditLogTable logs={auditLogs} />}
    </div>
  );
}

// ── Warnings Table ──

function WarningsTable({ warnings }: { warnings: EmployeeWarning[] }) {
  if (warnings.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">No warnings issued yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Issued Warnings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Issued By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warnings.map((w, i) => (
                <TableRow key={w.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{w.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{w.employee_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      {warningTypeLabels[w.warning_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{w.description}</TableCell>
                  <TableCell className="text-muted-foreground">{w.issuer_name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(w.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

**4. HR Actions page route** at `/home/moayadalqam/projects/kunoz/src/app/(dashboard)/dashboard/hr-actions/page.tsx`:

```tsx
import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOvertimeQueueAction,
  getAuditLogAction,
  getWarningsAction,
} from "@/actions/hr-actions";
import { HrActionsPage } from "@/components/reports/hr-actions-page";

export const metadata = {
  title: "HR Actions -- Kunoz",
};

export default async function HrActionsRoute() {
  await requireRole("admin", "hr_officer");

  const adminClient = createAdminClient();

  const [empResult, overtimeEntries, warnings, auditLogs] = await Promise.all([
    adminClient
      .from("employees")
      .select("id, full_name, employee_number")
      .eq("is_active", true)
      .order("full_name"),
    getOvertimeQueueAction(),
    getWarningsAction(),
    getAuditLogAction(50),
  ]);

  const employees = (empResult.data ?? []).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    employee_number: e.employee_number,
  }));

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          HR Actions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage overtime approvals, warnings, and attendance corrections
        </p>
      </div>
      <HrActionsPage
        employees={employees}
        overtimeEntries={overtimeEntries}
        warnings={warnings}
        auditLogs={auditLogs}
      />
    </div>
  );
}
```
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -10
```
Expected output: no TypeScript errors.

```bash
test -f /home/moayadalqam/projects/kunoz/src/app/\(dashboard\)/dashboard/hr-actions/page.tsx && echo "EXISTS" || echo "MISSING"
```
Expected output: `EXISTS`

```bash
ls /home/moayadalqam/projects/kunoz/src/components/reports/ | wc -l
```
Expected output: `12` or more files (all report components + HR action components).
  </verify>
  <done>HR Actions page at /dashboard/hr-actions with 4 tabs (Overtime Queue, Warnings, Leave, Audit Log), overtime approve/reject buttons, warning and leave dialogs, and audit log table showing action history</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes
- HR Actions page accessible at /dashboard/hr-actions for admin and hr_officer
- Overtime queue shows pending entries with approve/reject buttons
- Warning dialog allows selecting employee, type, and writing description
- Leave dialog allows selecting employee, date, status, and reason
- Audit log shows all HR actions with performer name and timestamps
</verification>

<success_criteria>
- Overtime approval: click Approve -> record updated, toast shown, entry moves to Processed
- Warning issuance: fill dialog -> submit -> warning appears in Warnings table + audit log
- Leave marking: fill dialog -> submit -> toast shown + audit log entry created
- Audit log: shows action type badge, performer name, old/new value diff, timestamp
</success_criteria>

<output>
After completion, create `.planning/phases/6-reports-hr-actions/6-06-SUMMARY.md`
</output>

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  AlertTriangle,
  Calendar,
  ClipboardList,
  Pencil,
  Plus,
} from "lucide-react";
import { OvertimeApproval } from "@/components/hr-actions/overtime-approval";
import { WarningForm } from "@/components/hr-actions/warning-form";
import { LeaveDialog } from "@/components/hr-actions/leave-dialog";
import { AuditLog } from "@/components/hr-actions/audit-log";
import { CorrectionsTab } from "@/components/hr-actions/corrections-tab";

interface HrActionsPageProps {
  employees: { id: string; full_name: string; employee_number: string }[];
}

type TabId = "corrections" | "overtime" | "warnings" | "leave" | "audit";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "corrections", label: "Corrections", icon: Pencil },
  { id: "overtime", label: "Overtime Approval", icon: Clock },
  { id: "warnings", label: "Warnings", icon: AlertTriangle },
  { id: "leave", label: "Leave / Absence", icon: Calendar },
  { id: "audit", label: "Audit Log", icon: ClipboardList },
];

export function HrActionsPage({ employees }: HrActionsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("corrections");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            HR Actions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage overtime approvals, warnings, leave records, and audit trail.
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }
                `}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Short label for mobile */}
                <span className="sm:hidden">
                  {tab.id === "corrections"
                    ? "Fix"
                    : tab.id === "overtime"
                      ? "OT"
                      : tab.id === "warnings"
                        ? "Warn"
                        : tab.id === "leave"
                          ? "Leave"
                          : "Audit"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Tab content */}
      {activeTab === "corrections" && <CorrectionsTab />}

      {activeTab === "overtime" && <OvertimeApproval />}

      {activeTab === "warnings" && <WarningForm employees={employees} />}

      {activeTab === "leave" && (
        <div>
          <div className="mb-6">
            <Button onClick={() => setLeaveDialogOpen(true)}>
              <Plus data-icon="inline-start" className="size-4" />
              Mark Leave / Absence
            </Button>
          </div>

          <LeaveDialog
            employees={employees}
            open={leaveDialogOpen}
            onOpenChange={setLeaveDialogOpen}
          />

          {/* The leave tab shows a note about using the audit log for history */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-12">
            <Calendar className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Use the button above to mark an employee as on leave or absent.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              View recorded leave actions in the Audit Log tab.
            </p>
          </div>
        </div>
      )}

      {activeTab === "audit" && <AuditLog />}
    </div>
  );
}

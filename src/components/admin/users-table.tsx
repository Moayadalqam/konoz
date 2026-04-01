"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  approveUserAction,
  rejectUserAction,
  changeRoleAction,
} from "@/actions/admin";
import type { Profile, AppRole } from "@/lib/auth/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "approved" | "rejected";

interface UsersTableProps {
  profiles: Profile[];
  currentFilter: string;
  currentRole: AppRole;
}

// ─── Role / Status Display Config ────────────────────────────────────────────

const ROLE_CONFIG: Record<AppRole, { label: string; className: string }> = {
  admin: {
    label: "Admin",
    className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/50",
  },
  hr_officer: {
    label: "HR Officer",
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50",
  },
  supervisor: {
    label: "Supervisor",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
  },
  employee: {
    label: "Employee",
    className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700/50",
  },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50",
  },
};

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: AppRole }) {
  const config = ROLE_CONFIG[role];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

function ApprovalActions({
  userId,
  isPending,
}: {
  userId: string;
  isPending: boolean;
}) {
  const [isApproving, startApprove] = useTransition();
  const [isRejecting, startReject] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="xs"
        disabled={isPending || isApproving || isRejecting}
        className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        onClick={() => {
          startApprove(async () => {
            await approveUserAction(userId);
          });
        }}
      >
        {isApproving ? "..." : "Approve"}
      </Button>
      <Button
        size="xs"
        variant="destructive"
        disabled={isPending || isApproving || isRejecting}
        onClick={() => {
          startReject(async () => {
            await rejectUserAction(userId);
          });
        }}
      >
        {isRejecting ? "..." : "Reject"}
      </Button>
    </div>
  );
}

function RoleSelector({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: AppRole;
}) {
  const [isChanging, startChange] = useTransition();

  return (
    <Select
      value={currentRole}
      disabled={isChanging}
      onValueChange={(newRole) => {
        if (newRole && newRole !== currentRole) {
          startChange(async () => {
            await changeRoleAction(userId, newRole as AppRole);
          });
        }
      }}
    >
      <SelectTrigger size="sm" className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="hr_officer">HR Officer</SelectItem>
        <SelectItem value="supervisor">Supervisor</SelectItem>
        <SelectItem value="employee">Employee</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── Filter Tabs ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StatusFilterTabs({ currentFilter }: { currentFilter: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleFilter(status: StatusFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`/admin/users?${params.toString()}`);
  }

  const active = (searchParams.get("status") as StatusFilter) ?? "all";

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleFilter(tab.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            active === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Mobile Card ─────────────────────────────────────────────────────────────

function UserCard({
  profile,
  isAdmin,
}: {
  profile: Profile;
  isAdmin: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {profile.full_name}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {profile.email}
          </p>
        </div>
        <StatusBadge status={profile.registration_status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RoleBadge role={profile.role} />
        <span className="text-xs text-muted-foreground">
          {formatDate(profile.created_at)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
        {profile.registration_status === "pending" && (
          <ApprovalActions userId={profile.id} isPending={false} />
        )}
        {isAdmin && (
          <RoleSelector userId={profile.id} currentRole={profile.role} />
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function UsersTable({
  profiles,
  currentFilter,
  currentRole,
}: UsersTableProps) {
  const isAdmin = currentRole === "admin";

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4">
        <StatusFilterTabs currentFilter={currentFilter} />
      </div>

      {/* Desktop: Table */}
      {profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
          <p className="text-sm font-medium text-muted-foreground">
            No users found
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.full_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {profile.email}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={profile.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={profile.registration_status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(profile.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {profile.registration_status === "pending" && (
                          <ApprovalActions
                            userId={profile.id}
                            isPending={false}
                          />
                        )}
                        {isAdmin && (
                          <RoleSelector
                            userId={profile.id}
                            currentRole={profile.role}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {profiles.map((profile) => (
              <UserCard key={profile.id} profile={profile} isAdmin={isAdmin} />
            ))}
          </div>
        </>
      )}

      {/* Total count */}
      {profiles.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {profiles.length} user{profiles.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

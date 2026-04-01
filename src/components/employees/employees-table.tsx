"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronRight,
  CircleCheck,
  CircleOff,
  SearchX,
  Users,
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
import { buttonVariants } from "@/components/ui/button";
import type { EmployeeWithLocation } from "@/lib/validations/employee";

// ---- Types ----------------------------------------------------------------

type SortKey =
  | "employee_number"
  | "full_name"
  | "department"
  | "position"
  | "location"
  | "is_active";

type SortDir = "asc" | "desc";

interface EmployeesTableProps {
  employees: EmployeeWithLocation[];
}

// ---- Helpers ---------------------------------------------------------------

function compareValues(a: string | null, b: string | null, dir: SortDir): number {
  const aVal = a ?? "";
  const bVal = b ?? "";
  const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

function sortEmployees(
  list: EmployeeWithLocation[],
  key: SortKey,
  dir: SortDir,
): EmployeeWithLocation[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case "employee_number":
        return compareValues(a.employee_number, b.employee_number, dir);
      case "full_name":
        return compareValues(a.full_name, b.full_name, dir);
      case "department":
        return compareValues(a.department, b.department, dir);
      case "position":
        return compareValues(a.position, b.position, dir);
      case "location":
        return compareValues(
          a.locations?.name ?? null,
          b.locations?.name ?? null,
          dir,
        );
      case "is_active": {
        const aActive = a.is_active ? 1 : 0;
        const bActive = b.is_active ? 1 : 0;
        return dir === "asc" ? aActive - bActive : bActive - aActive;
      }
      default:
        return 0;
    }
  });
}

// ---- Sub-components --------------------------------------------------------

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge
      variant="outline"
      className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300"
    >
      <CircleCheck className="size-3" />
      Active
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700/50 dark:bg-slate-950/40 dark:text-slate-400"
    >
      <CircleOff className="size-3" />
      Inactive
    </Badge>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown
          className={`size-3 ${isActive ? "text-primary" : "text-muted-foreground/50"}`}
        />
      </button>
    </TableHead>
  );
}

// ---- Mobile card -----------------------------------------------------------

function EmployeeCard({ employee }: { employee: EmployeeWithLocation }) {
  return (
    <Link
      href={`/dashboard/employees/${employee.id}`}
      className="group block rounded-lg border border-slate-200 bg-card p-4 transition-colors hover:border-primary/30 dark:border-slate-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {employee.full_name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            #{employee.employee_number}
          </p>
        </div>
        <StatusBadge isActive={employee.is_active} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {employee.department && (
          <span>{employee.department}</span>
        )}
        {employee.position && (
          <span>{employee.position}</span>
        )}
      </div>

      {employee.locations?.name && (
        <p className="mt-2 text-xs text-muted-foreground/80">
          {employee.locations.name}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        View details
        <ChevronRight className="ml-0.5 size-3.5" />
      </div>
    </Link>
  );
}

// ---- Main component --------------------------------------------------------

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("employee_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = sortEmployees(employees, sortKey, sortDir);

  // ---- Empty state ----
  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-5 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          No employees found
        </p>
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          Try adjusting your filters or search term to find who you are looking
          for.
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
              <SortableHeader
                label="#"
                sortKey="employee_number"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Name"
                sortKey="full_name"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Department"
                sortKey="department"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Position"
                sortKey="position"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Location"
                sortKey="location"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Status"
                sortKey="is_active"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((emp, idx) => (
              <TableRow
                key={emp.id}
                className={idx % 2 === 1 ? "bg-muted/20" : ""}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {emp.employee_number}
                </TableCell>
                <TableCell className="font-medium">{emp.full_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {emp.department ?? "--"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {emp.position ?? "--"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {emp.locations?.name ?? "--"}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={emp.is_active} />
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/dashboard/employees/${emp.id}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    View
                    <ChevronRight className="ml-0.5 size-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((emp) => (
          <EmployeeCard key={emp.id} employee={emp} />
        ))}
      </div>

      {/* Footer count */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5" />
        Showing {employees.length} employee{employees.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

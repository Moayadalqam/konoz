"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeFilters } from "@/components/employees/employee-filters";
import { EmployeesTable } from "@/components/employees/employees-table";
import { EmployeeForm } from "@/components/employees/employee-form";
import type { EmployeeWithLocation } from "@/lib/validations/employee";
import type { Location } from "@/lib/validations/location";

interface EmployeesPageProps {
  employees: EmployeeWithLocation[];
  locations: Location[];
  initialFilters: {
    location?: string;
    department?: string;
    status?: string;
    search?: string;
  };
}

export function EmployeesPage({
  employees,
  locations,
  initialFilters,
}: EmployeesPageProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Employees
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage employee records, assignments, and status.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setFormOpen(true)}>
          <UserPlus data-icon="inline-start" className="size-4" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <EmployeeFilters
        locations={locations}
        initialFilters={initialFilters}
      />

      {/* Table */}
      <EmployeesTable employees={employees} />

      {/* Create dialog */}
      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        locations={locations}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

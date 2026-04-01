"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShiftList } from "@/components/shifts/shift-list";
import { ShiftFormDialog } from "@/components/shifts/shift-form-dialog";
import { ShiftAssignmentDialog } from "@/components/shifts/shift-assignment-dialog";
import type { ShiftWithAssignmentCount } from "@/lib/validations/shift";
import type { Location } from "@/lib/validations/location";
import type { Employee } from "@/lib/validations/employee";

interface ShiftsPageProps {
  shifts: ShiftWithAssignmentCount[];
  locations: Location[];
  employees: Employee[];
}

export function ShiftsPage({ shifts, locations, employees }: ShiftsPageProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithAssignmentCount | null>(null);
  const [assigningShift, setAssigningShift] = useState<ShiftWithAssignmentCount | null>(null);

  function handleEdit(shift: ShiftWithAssignmentCount) {
    setEditingShift(shift);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingShift(null);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingShift(null);
  }

  function handleAssign(shift: ShiftWithAssignmentCount) {
    setAssigningShift(shift);
  }

  function handleAssignClose(open: boolean) {
    if (!open) setAssigningShift(null);
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Shifts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define shift templates and assign them to locations or employees.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleCreate}>
          <Plus data-icon="inline-start" className="size-4" />
          Create Shift
        </Button>
      </div>

      {/* Shift list */}
      <ShiftList
        shifts={shifts}
        onEdit={handleEdit}
        onAssign={handleAssign}
        onRefresh={() => router.refresh()}
      />

      {/* Create/Edit dialog */}
      <ShiftFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        shift={editingShift}
        onSuccess={() => router.refresh()}
      />

      {/* Assignment dialog */}
      <ShiftAssignmentDialog
        open={!!assigningShift}
        onOpenChange={handleAssignClose}
        shift={assigningShift}
        locations={locations}
        employees={employees}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

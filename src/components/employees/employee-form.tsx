"use client";

import { useState, useTransition } from "react";
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
import { toast } from "sonner";
import {
  createEmployeeAction,
  updateEmployeeAction,
} from "@/actions/employees";
import {
  employeeSchema,
  DEPARTMENTS,
  POSITIONS,
} from "@/lib/validations/employee";
import type { Employee } from "@/lib/validations/employee";
import type { Location } from "@/lib/validations/location";

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  locations: Location[];
  onSuccess?: () => void;
}

export function EmployeeForm({
  open,
  onOpenChange,
  employee,
  locations,
  onSuccess,
}: EmployeeFormProps) {
  const isEdit = !!employee;
  const [isPending, startTransition] = useTransition();

  const [employeeNumber, setEmployeeNumber] = useState(
    employee?.employee_number ?? ""
  );
  const [fullName, setFullName] = useState(employee?.full_name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [department, setDepartment] = useState(employee?.department ?? "");
  const [position, setPosition] = useState(employee?.position ?? "");
  const [locationId, setLocationId] = useState(
    employee?.primary_location_id ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const data = {
      employee_number: employeeNumber,
      full_name: fullName,
      phone: phone || undefined,
      department: department || undefined,
      position: position || undefined,
      primary_location_id: locationId || undefined,
      is_active: employee?.is_active ?? true,
    };

    const parsed = employeeSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && employee) {
          await updateEmployeeAction(employee.id, parsed.data);
          toast.success("Employee updated");
        } else {
          await createEmployeeAction(parsed.data);
          toast.success("Employee created");
        }
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the employee details below."
              : "Fill in the details for the new employee."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee_number">Employee # *</Label>
              <Input
                id="employee_number"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="KNZ-071"
                disabled={isEdit}
              />
              {errors.employee_number && (
                <p className="text-xs text-destructive">
                  {errors.employee_number}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Mohammed Al-Rashidi"
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966-5X-XXX-XXXX"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={(v) => setPosition(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Primary Location</Label>
            <Select value={locationId} onValueChange={(v) => setLocationId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((l) => l.is_active)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} — {loc.city}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Employee"
                  : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

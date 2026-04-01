import { z } from "zod";
export const employeeSchema = z.object({
  employee_number: z
    .string()
    .min(1, "Employee number is required")
    .max(20),
  full_name: z.string().min(1, "Full name is required").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  position: z.string().max(100).optional().or(z.literal("")),
  primary_location_id: z.string().uuid("Invalid location").optional().or(z.literal("")),
  profile_id: z.string().uuid("Invalid profile").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

export interface Employee {
  id: string;
  profile_id: string | null;
  employee_number: string;
  full_name: string;
  full_name_ar: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  primary_location_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithLocation extends Employee {
  locations: { name: string } | null;
}

export interface EmployeeFilters {
  locationId?: string;
  department?: string;
  isActive?: boolean;
  search?: string;
}

export const DEPARTMENTS = [
  "Operations",
  "Production",
  "Engineering",
  "Administration",
  "Logistics",
  "HR",
] as const;

export const POSITIONS = [
  "Laborer",
  "Technician",
  "Supervisor",
  "Site Engineer",
  "Coordinator",
  "Driver",
  "Accountant",
  "HR Officer",
  "Head of Department",
] as const;

import { z } from "zod";

// ── Zod Schemas ──

export const shiftSchema = z.object({
  name: z.string().min(1, "Shift name is required").max(100),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  break_duration_minutes: z.coerce.number().int().min(0).max(480).default(60),
  grace_period_minutes: z.coerce.number().int().min(0).max(120).default(15),
  is_active: z.boolean().default(true),
});

export type ShiftFormData = z.infer<typeof shiftSchema>;

export const shiftAssignmentSchema = z
  .object({
    shift_id: z.string().uuid("Invalid shift"),
    location_id: z.string().uuid("Invalid location").optional(),
    employee_id: z.string().uuid("Invalid employee").optional(),
    effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    effective_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
      .optional(),
  })
  .refine(
    (data) =>
      (data.location_id && !data.employee_id) ||
      (!data.location_id && data.employee_id),
    { message: "Assign to either a location or an employee, not both" }
  );

export type ShiftAssignmentFormData = z.infer<typeof shiftAssignmentSchema>;

// ── TypeScript Interfaces ──

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  grace_period_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftWithAssignmentCount extends Shift {
  assignment_count: number;
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  location_id: string | null;
  employee_id: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignmentWithDetails extends ShiftAssignment {
  shifts: { name: string; start_time: string; end_time: string } | null;
  locations: { name: string } | null;
  employees: { full_name: string; employee_number: string } | null;
}

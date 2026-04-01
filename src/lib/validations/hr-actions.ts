import { z } from "zod";

// ── Zod Schemas ──

export const correctionSchema = z.object({
  attendance_id: z.string().uuid(),
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
  status: z
    .enum(["present", "late", "early_departure", "absent", "on_leave"])
    .optional(),
  reason: z.string().min(1, "Reason is required").max(500),
});

export type CorrectionInput = z.infer<typeof correctionSchema>;

export const overtimeDecisionSchema = z.object({
  attendance_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).optional(),
});

export type OvertimeDecisionInput = z.infer<typeof overtimeDecisionSchema>;

export const warningSchema = z.object({
  employee_id: z.string().uuid(),
  warning_type: z.enum(["verbal", "written", "final"]),
  description: z.string().min(1, "Description is required").max(2000),
  related_attendance_ids: z.array(z.string().uuid()).optional(),
});

export type WarningInput = z.infer<typeof warningSchema>;

export const leaveMarkSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  status: z.enum(["on_leave", "absent"]),
  reason: z.string().min(1, "Reason is required").max(500),
});

export type LeaveMarkInput = z.infer<typeof leaveMarkSchema>;

// ── TypeScript Interfaces ──

export interface HrActionLog {
  id: string;
  action_type: string;
  target_table: string;
  target_record_id: string;
  performed_by: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
  performer_name?: string;
}

export interface EmployeeWarning {
  id: string;
  employee_id: string;
  issued_by: string;
  warning_type: "verbal" | "written" | "final";
  description: string;
  related_attendance_ids: string[];
  created_at: string;
  issuer_name?: string;
  employee_name?: string;
}

export interface PendingOvertimeRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  location_name: string;
  shift_name: string | null;
  clock_in: string;
  clock_out: string | null;
  overtime_minutes: number;
  overtime_status: "pending";
  date: string;
}

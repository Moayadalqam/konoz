import { z } from "zod";

// ── Types ──

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  location_id: string;
  shift_id: string | null;
  clock_in: string;
  clock_out: string | null;
  clock_in_lat: number;
  clock_in_lng: number;
  clock_in_accuracy: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_out_accuracy: number | null;
  clock_in_within_geofence: boolean;
  clock_out_within_geofence: boolean | null;
  clock_in_method: "self" | "supervisor_batch" | "manual_correction";
  clock_out_method:
    | "self"
    | "supervisor_batch"
    | "manual_correction"
    | "auto_shift_end"
    | null;
  clock_in_photo_url: string | null;
  status: "present" | "late" | "early_departure" | "absent" | "on_leave";
  total_minutes: number | null;
  is_overtime: boolean;
  overtime_minutes: number;
  notes: string | null;
  submitted_by: string | null;
  is_corrected: boolean;
  synced_at: string | null;
  client_created_at: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceWithEmployee extends AttendanceRecord {
  employees: { full_name: string; employee_number: string } | null;
}

export interface AttendanceWithDetails extends AttendanceRecord {
  employees: { full_name: string; employee_number: string } | null;
  locations: { name: string; city: string } | null;
  shifts: { name: string } | null;
}

export type TodayStatus = "not_clocked_in" | "clocked_in" | "clocked_out";

export interface TodayStatusResult {
  status: TodayStatus;
  record?: AttendanceRecord;
}

export interface SiteEmployeeAttendance {
  employee_id: string;
  full_name: string;
  employee_number: string;
  status: "checked_in" | "checked_out" | "not_yet";
  clock_in?: string;
  clock_out?: string;
  total_minutes?: number | null;
  clock_in_method?: string;
  attendance_id?: string;
  notes?: string | null;
  shift_name?: string | null;
  attendance_status?: "present" | "late" | "early_departure" | "absent" | "on_leave";
  is_overtime?: boolean;
  overtime_minutes?: number;
  clock_in_photo_url?: string | null;
  clock_in_lat?: number | null;
  clock_in_lng?: number | null;
}

// ── Zod Schemas ──

export const clockInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  photo_base64: z.string().max(5_000_000, "Photo too large (max ~3.5MB)").optional(),
});

export type ClockInInput = z.infer<typeof clockInSchema>;

export const clockOutSchema = z.object({
  attendance_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
});

export type ClockOutInput = z.infer<typeof clockOutSchema>;

export const batchClockInSchema = z.object({
  employee_ids: z
    .array(z.string().uuid())
    .min(1, "Select at least one employee"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export type BatchClockInInput = z.infer<typeof batchClockInSchema>;

export const attendanceNoteSchema = z.object({
  attendance_id: z.string().uuid(),
  notes: z.string().min(1, "Note is required").max(500),
});

export type AttendanceNoteInput = z.infer<typeof attendanceNoteSchema>;

export interface AttendanceFilters {
  from?: string;
  to?: string;
}

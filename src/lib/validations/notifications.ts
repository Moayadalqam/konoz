export const NOTIFICATION_TYPES = [
  "geofence_violation",
  "late_arrival",
  "daily_anomaly_summary",
  "sync_confirmation",
  "overtime_pending",
  "warning_issued",
  "registration_approved",
  "registration_rejected",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}


"use client";

import {
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Timer,
  AlertOctagon,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { Notification, NotificationType } from "@/lib/validations/notifications";
import { cn } from "@/lib/utils";

const typeConfig: Record<
  NotificationType,
  { icon: LucideIcon; color: string; bg: string }
> = {
  geofence_violation: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  late_arrival: {
    icon: Clock,
    color: "text-warning-foreground",
    bg: "bg-warning/15",
  },
  daily_anomaly_summary: {
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  sync_confirmation: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
  },
  overtime_pending: {
    icon: Timer,
    color: "text-warning-foreground",
    bg: "bg-warning/15",
  },
  warning_issued: {
    icon: AlertOctagon,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  registration_approved: {
    icon: UserCheck,
    color: "text-success",
    bg: "bg-success/10",
  },
  registration_rejected: {
    icon: UserX,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
};

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  onNavigate?: (notification: Notification) => void;
  truncateBody?: boolean;
}

export function NotificationItem({
  notification,
  onClick,
  onNavigate,
  truncateBody = true,
}: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  function handleClick() {
    onClick?.(notification);
    onNavigate?.(notification);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
        "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        !notification.is_read && "bg-primary/[0.03]"
      )}
    >
      {/* Unread dot */}
      <div className="flex flex-col items-center pt-1.5">
        <div
          className={cn(
            "size-2 rounded-full transition-opacity",
            notification.is_read ? "opacity-0" : "bg-primary opacity-100"
          )}
        />
      </div>

      {/* Icon */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          config.bg
        )}
      >
        <Icon className={cn("size-[18px]", config.color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            notification.is_read
              ? "font-normal text-foreground/80"
              : "font-semibold text-foreground"
          )}
        >
          {notification.title}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[13px] leading-relaxed text-muted-foreground",
            truncateBody && "line-clamp-2"
          )}
        >
          {notification.body}
        </p>
      </div>

      {/* Timestamp */}
      <span className="shrink-0 pt-0.5 text-xs text-muted-foreground/70">
        {formatRelativeTime(notification.created_at)}
      </span>
    </button>
  );
}

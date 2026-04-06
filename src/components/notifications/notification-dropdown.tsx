"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getNotificationsAction, markNotificationReadAction, markAllReadAction } from "@/actions/notifications";
import type { Notification } from "@/lib/validations/notifications";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationItem } from "./notification-item";

interface NotificationDropdownProps {
  isOpen: boolean;
  onUnreadCountChange?: (count: number) => void;
  onClose?: () => void;
}

export function NotificationDropdown({
  isOpen,
  onUnreadCountChange,
  onClose,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!isOpen) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync loading state before async fetch
    setLoading(true);
    getNotificationsAction(10)
      .then((data) => {
        setNotifications(data);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  function handleMarkRead(notification: Notification) {
    if (notification.is_read) return;

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
    onUnreadCountChange?.(-1);

    startTransition(async () => {
      await markNotificationReadAction(notification.id);
    });
  }

  function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.is_read).length;
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() }))
    );
    onUnreadCountChange?.(-unread);

    startTransition(async () => {
      await markAllReadAction();
    });
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Notifications
        </h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-primary"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <ScrollArea className="max-h-96">
        <div className="px-1 pb-1">
          {loading ? (
            <div className="space-y-2 px-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CheckCircle2 className="size-10 text-primary/30" />
              <p className="mt-3 text-sm font-medium">You&apos;re all caught up</p>
              <p className="mt-0.5 text-xs">No new notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleMarkRead}
                truncateBody
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <Link
            href="/dashboard/notifications"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full text-primary" })}
            onClick={onClose}
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}

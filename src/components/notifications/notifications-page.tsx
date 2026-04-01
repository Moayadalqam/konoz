"use client";

import { useState, useTransition, useMemo } from "react";
import { CheckCircle2, Inbox } from "lucide-react";
import {
  markNotificationReadAction,
  markAllReadAction,
} from "@/actions/notifications";
import type { Notification, NotificationType } from "@/lib/validations/notifications";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./notification-item";

const FILTER_TABS: { value: string; label: string; types?: NotificationType[] }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "geofence", label: "Geofence", types: ["geofence_violation"] },
  { value: "late", label: "Late", types: ["late_arrival"] },
  { value: "summary", label: "Summary", types: ["daily_anomaly_summary"] },
  { value: "sync", label: "Sync", types: ["sync_confirmation"] },
];

interface NotificationsPageProps {
  initialNotifications: Notification[];
}

export function NotificationsPage({ initialNotifications }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState("all");
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.value === activeTab);
    if (!tab) return notifications;

    if (activeTab === "unread") {
      return notifications.filter((n) => !n.is_read);
    }

    if (tab.types) {
      return notifications.filter((n) => tab.types!.includes(n.type));
    }

    return notifications;
  }, [notifications, activeTab]);

  function handleMarkRead(notification: Notification) {
    if (notification.is_read) return;

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    );

    startTransition(async () => {
      await markNotificationReadAction(notification.id);
    });
  }

  function handleMarkAllRead() {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at ?? new Date().toISOString(),
      }))
    );

    startTransition(async () => {
      await markAllReadAction();
    });
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
          >
            <CheckCircle2 className="size-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs + Content */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as string)}
        className="mt-6"
      >
        <TabsList variant="line" className="overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {tab.value === "unread" && unreadCount > 0 && (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {FILTER_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {filtered.length === 0 ? (
              <EmptyState tab={tab.value} />
            ) : (
              <div className="space-y-1">
                {filtered.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleMarkRead}
                    truncateBody={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, { title: string; subtitle: string }> = {
    all: { title: "No notifications yet", subtitle: "When something happens, you'll see it here" },
    unread: { title: "All read", subtitle: "You've seen everything" },
    geofence: { title: "No geofence alerts", subtitle: "No boundary violations recorded" },
    late: { title: "No late arrivals", subtitle: "Everyone's on time" },
    summary: { title: "No daily summaries", subtitle: "Summaries will appear here" },
    sync: { title: "No sync confirmations", subtitle: "Offline syncs will show up here" },
  };

  const msg = messages[tab] ?? messages.all;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Inbox className="size-7 text-muted-foreground/50" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground/70">{msg.title}</p>
      <p className="mt-1 text-xs">{msg.subtitle}</p>
    </div>
  );
}

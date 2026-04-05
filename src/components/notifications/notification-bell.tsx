"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getUnreadCountAction } from "@/actions/notifications";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./notification-dropdown";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    getUnreadCountAction().then(({ count }) => setUnreadCount(count));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          setUnreadCount((prev) => prev + 1);
          const newNotification = payload.new as { title?: string };
          if (newNotification.title) {
            toast(newNotification.title, {
              description: "New notification",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleUnreadCountChange = useCallback((delta: number) => {
    setUnreadCount((prev) => Math.max(0, prev + delta));
  }, []);

  const bellButton = (
    <button
      type="button"
      className="relative inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Bell className="size-[18px]" />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white",
            "min-w-[18px] h-[18px] px-1",
            "animate-in zoom-in-50 fade-in duration-200"
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      <span className="sr-only">
        {unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      </span>
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={(open) => setSheetOpen(open)}>
        <SheetTrigger render={bellButton} />
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl pb-6">
          <SheetTitle className="sr-only">Notifications</SheetTitle>
          <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/20" />
          <NotificationDropdown
            isOpen={sheetOpen}
            onUnreadCountChange={handleUnreadCountChange}
            onClose={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={(open) => setPopoverOpen(open)}>
      <PopoverTrigger render={bellButton} />
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-96 p-0"
      >
        <NotificationDropdown
          isOpen={popoverOpen}
          onUnreadCountChange={handleUnreadCountChange}
          onClose={() => setPopoverOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

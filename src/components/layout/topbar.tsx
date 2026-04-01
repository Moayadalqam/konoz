"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import type { Profile } from "@/lib/auth/types";
import { ConnectionStatus } from "@/components/pwa/connection-status";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ profile }: { profile: Profile }) {
  const initials = profile.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      {/* Left — connection status */}
      <ConnectionStatus />

      {/* Right — user menu + notifications */}
      <div className="flex items-center gap-2">
        <NotificationBell userId={profile.id} />
        <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted outline-none">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight text-foreground">
              {profile.full_name}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              {profile.email}
            </p>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end" sideOffset={8} className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {profile.full_name}
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {profile.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/dashboard/profile" />}>
            <User className="size-4" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await signOutAction();
            }}
            variant="destructive"
          >
            <LogOut className="size-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}

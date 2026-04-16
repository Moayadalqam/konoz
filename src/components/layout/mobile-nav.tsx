"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  MapPin,
  Users,
  UserCheck,
  BarChart3,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Profile, AppRole } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

interface MobileTab {
  label: string;
  href: string;
  icon: LucideIcon;
}

function getTabsForRole(role: AppRole): MobileTab[] {
  switch (role) {
    case "employee":
      return [
        { label: "Home", href: "/dashboard", icon: LayoutDashboard },
        { label: "Clock In", href: "/dashboard/attendance", icon: Clock },
        { label: "Profile", href: "/dashboard/profile", icon: User },
      ];
    case "supervisor":
      return [
        { label: "Home", href: "/dashboard", icon: LayoutDashboard },
        { label: "Site", href: "/dashboard/site-attendance", icon: Users },
        { label: "Bulk", href: "/dashboard/bulk-checkin", icon: UserCheck },
        { label: "Profile", href: "/dashboard/profile", icon: User },
      ];
    case "hr_officer":
      return [
        { label: "Home", href: "/dashboard", icon: LayoutDashboard },
        { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
        { label: "Employees", href: "/dashboard/employees", icon: Users },
        { label: "Profile", href: "/dashboard/profile", icon: User },
      ];
    case "admin":
      return [
        { label: "Home", href: "/dashboard", icon: LayoutDashboard },
        { label: "Locations", href: "/dashboard/locations", icon: MapPin },
        { label: "Profile", href: "/dashboard/profile", icon: User },
      ];
  }
}

export function MobileNav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const tabs = getTabsForRole(profile.role);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-16 items-center justify-around px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium leading-tight truncate max-w-full px-0.5">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

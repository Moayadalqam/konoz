"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  Users,
  UserCheck,
  BarChart3,
  MapPin,
  Shield,
  CalendarClock,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import type { Profile, AppRole } from "@/lib/auth/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: AppRole[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Employees",
    items: [
      {
        label: "Employee List",
        href: "/dashboard/employees",
        icon: Users,
        roles: ["hr_officer", "admin"],
      },
      {
        label: "My Attendance",
        href: "/dashboard/attendance",
        icon: Clock,
        roles: ["employee", "supervisor"],
      },
      {
        label: "Shifts",
        href: "/dashboard/shifts",
        icon: CalendarClock,
        roles: ["hr_officer", "admin"],
      },
      {
        label: "HR Actions",
        href: "/dashboard/hr-actions",
        icon: ClipboardCheck,
        roles: ["hr_officer", "admin"],
      },
    ],
  },
  {
    label: "Locations",
    items: [
      {
        label: "Location List",
        href: "/dashboard/locations",
        icon: MapPin,
        roles: ["hr_officer", "admin"],
      },
      {
        label: "Site Attendance",
        href: "/dashboard/site-attendance",
        icon: Users,
        roles: ["supervisor"],
      },
      {
        label: "Bulk Check-in",
        href: "/dashboard/bulk-checkin",
        icon: UserCheck,
        roles: ["supervisor"],
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: BarChart3,
        roles: ["hr_officer", "admin"],
      },
    ],
  },
  {
    label: "User Management",
    items: [
      {
        label: "User Management",
        href: "/admin/users",
        icon: Shield,
        roles: ["admin"],
      },
    ],
  },
];

const roleLabelMap: Record<AppRole, string> = {
  admin: "Admin",
  hr_officer: "HR Officer",
  supervisor: "Supervisor",
  employee: "Employee",
};

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(profile.role)),
    }))
    .filter((section) => section.items.length > 0);

  const isActive = (href: string) => pathname.startsWith(href);

  const initials = profile.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-card">
      {/* Wordmark */}
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-heading text-xl font-bold tracking-tight text-primary">
            KUNOZ
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-1">
          {filteredSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "border-l-[3px] border-l-primary bg-primary/10 text-primary pl-[9px]"
                            : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* User info at bottom */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {profile.full_name}
            </p>
            <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0 h-4">
              {roleLabelMap[profile.role]}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

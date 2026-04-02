"use client";

import Link from "next/link";
import {
  MapPin,
  Users,
  UserCheck,
  Clock,
} from "lucide-react";
import type { Profile } from "@/lib/auth/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/transitions/page-transition";

interface SupervisorDashboardProps {
  profile: Profile;
  siteStats: { total: number; present: number; location: string | null };
}

export function SupervisorDashboard({ profile, siteStats }: SupervisorDashboardProps) {
  const firstName = profile.full_name.split(" ")[0];

  return (
    <PageTransition className="w-full px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {siteStats.location ?? "No site assigned"}
        </p>
      </div>

      {/* Clock-in CTA */}
      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between sm:py-6">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Start Your Shift
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Clock in to begin tracking site attendance
            </p>
          </div>
          <Button size="lg" className="w-full sm:w-auto px-8 h-11 text-base" disabled>
            <Clock className="size-5" />
            Clock In
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Workers on Site" value={String(siteStats.total)} />
        <StatCard icon={UserCheck} label="Checked In" value={String(siteStats.present)} />
        <StatCard icon={Clock} label="Attendance" value={siteStats.total > 0 ? `${Math.round((siteStats.present / siteStats.total) * 100)}%` : "--"} />
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/bulk-checkin" className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
          <UserCheck className="size-4" />
          Bulk Check-in
        </Link>
        <Link href="/dashboard/site-attendance" className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
          <Users className="size-4" />
          Site Attendance
        </Link>
      </div>

      {/* Activity placeholder */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Site Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                Site activity will appear here once workers check in
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <p className="font-heading text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

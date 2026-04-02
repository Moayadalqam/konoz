"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Mail, Phone, Briefcase, Calendar, Shield, LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import type { Profile, AppRole } from "@/lib/auth/types";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/actions/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const roleLabelMap: Record<AppRole, string> = {
  admin: "Admin",
  hr_officer: "HR Officer",
  supervisor: "Supervisor",
  employee: "Employee",
};

const statusVariantMap: Record<string, "default" | "secondary" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
};

export function ProfileView({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    {}
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Profile updated successfully");
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const initials = profile.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const joinDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Profile overview */}
      <Card className="lg:col-span-1">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          {/* Avatar */}
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <span className="font-heading text-2xl font-bold text-primary">
              {initials}
            </span>
          </div>

          {/* Name and role */}
          <div className="text-center">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {profile.full_name}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {profile.email}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Badge>{roleLabelMap[profile.role]}</Badge>
            <Badge variant={statusVariantMap[profile.registration_status] ?? "secondary"}>
              {profile.registration_status}
            </Badge>
          </div>

          <Separator className="my-2" />

          {/* Read-only info */}
          <div className="w-full space-y-3 text-sm">
            <InfoRow icon={Mail} label="Email" value={profile.email} />
            <InfoRow icon={Shield} label="Role" value={roleLabelMap[profile.role]} />
            <InfoRow icon={Calendar} label="Joined" value={joinDate} />
            {profile.phone && (
              <InfoRow icon={Phone} label="Phone" value={profile.phone} />
            )}
            {profile.position && (
              <InfoRow icon={Briefcase} label="Position" value={profile.position} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            {/* Full name */}
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile.full_name}
                required
                minLength={2}
              />
              {state.fieldErrors?.full_name && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.full_name[0]}
                </p>
              )}
            </div>

            {/* Email — read only */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ""}
                placeholder="+962 7XX XXX XXX"
              />
              {state.fieldErrors?.phone && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.phone[0]}
                </p>
              )}
            </div>

            {/* Position */}
            <div className="space-y-1.5">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                defaultValue={profile.position ?? ""}
                placeholder="e.g. Site Engineer, Foreman"
              />
              {state.fieldErrors?.position && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.position[0]}
                </p>
              )}
            </div>

            {/* Role — read only */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input
                value={roleLabelMap[profile.role]}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Roles are managed by administrators
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>

          <Separator className="my-6" />

          <form action={signOutAction}>
            <Button type="submit" variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

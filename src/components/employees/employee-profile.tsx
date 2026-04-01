"use client";

import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Briefcase,
  Building2,
  Hash,
  User,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";

const MiniMap = dynamic(() => import("./employee-mini-map"), { ssr: false });

interface EmployeeProfileData {
  id: string;
  employee_number: string;
  full_name: string;
  full_name_ar: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  primary_location_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  locations: {
    id: string;
    name: string;
    city: string;
    latitude: number;
    longitude: number;
  } | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    registration_status: string;
  } | null;
}

export function EmployeeProfile({
  employee,
}: {
  employee: EmployeeProfileData;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/employees"
          className="flex size-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {employee.full_name}
            </h1>
            <Badge
              variant={employee.is_active ? "default" : "secondary"}
              className={
                employee.is_active
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : ""
              }
            >
              {employee.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {employee.employee_number}
            {employee.full_name_ar && ` — ${employee.full_name_ar}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Employee Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                icon={Hash}
                label="Employee Number"
                value={employee.employee_number}
              />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={employee.phone || "—"}
              />
              <InfoRow
                icon={Building2}
                label="Department"
                value={employee.department || "—"}
              />
              <InfoRow
                icon={Briefcase}
                label="Position"
                value={employee.position || "—"}
              />
              <InfoRow
                icon={MapPin}
                label="Location"
                value={
                  employee.locations
                    ? `${employee.locations.name} — ${employee.locations.city}`
                    : "Unassigned"
                }
              />
              <InfoRow
                icon={Clock}
                label="Joined"
                value={new Date(employee.created_at).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location Map */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Assigned Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employee.locations ? (
              <div className="space-y-3">
                <div className="h-48 overflow-hidden rounded-lg border border-border">
                  <MiniMap
                    latitude={employee.locations.latitude}
                    longitude={employee.locations.longitude}
                    name={employee.locations.name}
                  />
                </div>
                <p className="text-sm font-medium">{employee.locations.name}</p>
                <p className="text-xs text-muted-foreground">
                  {employee.locations.city}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No location assigned
              </p>
            )}
          </CardContent>
        </Card>

        {/* Linked Profile */}
        {employee.profile && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                App Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow
                  icon={User}
                  label="Email"
                  value={employee.profile.email}
                />
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Briefcase className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">App Role</p>
                    <Badge variant="outline" className="mt-1">
                      {employee.profile.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance History Placeholder */}
        <Card className={employee.profile ? "" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No attendance data yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Attendance history will appear here once clock-in/out is enabled
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

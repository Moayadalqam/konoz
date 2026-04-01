import { requireAuth } from "@/lib/auth/dal";
import { redirect } from "next/navigation";
import { ClockInButton } from "@/components/attendance/clock-in-button";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Attendance -- Kunoz",
};

export default async function AttendancePage() {
  const profile = await requireAuth();

  // Admin/HR don't clock in -- redirect to dashboard
  if (profile.role === "admin" || profile.role === "hr_officer") {
    redirect("/dashboard");
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          My Attendance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <Card className="mx-auto max-w-md">
        <CardContent>
          <ClockInButton />
        </CardContent>
      </Card>

      {/* Attendance history */}
      <div className="mx-auto mt-8 max-w-2xl">
        <AttendanceHistory />
      </div>
    </div>
  );
}

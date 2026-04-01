import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/dal";
import { ReportsPage } from "@/components/reports/reports-page";

export const metadata = {
  title: "Reports -- Kunoz",
};

export default async function ReportsRoute() {
  const profile = await requireAuth();
  if (profile.role !== "admin" && profile.role !== "hr_officer") {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: locations } = await admin
    .from("locations")
    .select("id, name")
    .order("name");

  return <ReportsPage locations={locations ?? []} />;
}

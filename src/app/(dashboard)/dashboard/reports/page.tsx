import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReportsPage } from "@/components/reports/reports-page";

export const metadata = {
  title: "Reports -- Kunoz",
};

export default async function ReportsRoute() {
  await requireRole("admin", "hr_officer");

  const admin = createAdminClient();
  const { data: locations } = await admin
    .from("locations")
    .select("id, name")
    .order("name");

  return <ReportsPage locations={locations ?? []} />;
}

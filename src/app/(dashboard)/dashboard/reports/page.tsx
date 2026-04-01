import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ReportsPage } from "@/components/reports/reports-page";

export const metadata = {
  title: "Reports -- Kunoz",
};

export default async function ReportsRoute() {
  await requireRole("admin", "hr_officer");

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .order("name");

  return <ReportsPage locations={locations ?? []} />;
}

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { HrActionsPage } from "@/components/hr-actions/hr-actions-page";

export default async function HrActionsRoute() {
  await requireRole("admin", "hr_officer");

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("is_active", true)
    .order("full_name");

  return <HrActionsPage employees={employees ?? []} />;
}

import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { HrActionsPage } from "@/components/hr-actions/hr-actions-page";

export default async function HrActionsRoute() {
  await requireRole("admin", "hr_officer");

  const admin = createAdminClient();
  const { data: employees } = await admin
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("is_active", true)
    .order("full_name");

  return <HrActionsPage employees={employees ?? []} />;
}

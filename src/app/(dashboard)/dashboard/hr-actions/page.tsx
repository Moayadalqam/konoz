import { requireAuth } from "@/lib/auth/dal";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { HrActionsPage } from "@/components/hr-actions/hr-actions-page";

export default async function HrActionsRoute() {
  const profile = await requireAuth();
  if (profile.role !== "admin" && profile.role !== "hr_officer") {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: employees } = await admin
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("is_active", true)
    .order("full_name");

  return <HrActionsPage employees={employees ?? []} />;
}

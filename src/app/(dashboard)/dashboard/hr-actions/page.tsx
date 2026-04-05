import { requireAuth } from "@/lib/auth/dal";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { HrActionsPage } from "@/components/hr-actions/hr-actions-page";

export default async function HrActionsRoute() {
  const profile = await requireAuth();

  if (profile.role !== "admin" && profile.role !== "hr_officer") {
    redirect("/dashboard");
  }

  let employees: { id: string; full_name: string; employee_number: string }[] = [];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employees")
      .select("id, full_name, employee_number")
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      console.error("[hr-actions] Supabase error:", error.message);
    }
    employees = data ?? [];
  } catch (err) {
    console.error("[hr-actions] Unexpected error:", err);
  }

  return <HrActionsPage employees={employees} />;
}

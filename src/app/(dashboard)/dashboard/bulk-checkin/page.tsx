import { requireRole } from "@/lib/auth/dal";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Bulk Check-in -- Kunoz",
};

export default async function BulkCheckinPage() {
  await requireRole("supervisor", "admin", "hr_officer");
  redirect("/dashboard/site-attendance");
}

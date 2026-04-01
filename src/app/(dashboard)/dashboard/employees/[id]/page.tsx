import { getEmployeeAction } from "@/actions/employees";
import { requireRole } from "@/lib/auth/dal";
import { EmployeeProfile } from "@/components/employees/employee-profile";
import { notFound } from "next/navigation";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("admin", "hr_officer", "supervisor");

  let employee;
  try {
    employee = await getEmployeeAction(id);
  } catch {
    notFound();
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <EmployeeProfile employee={employee} />
    </div>
  );
}

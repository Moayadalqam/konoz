import { requireRole } from "@/lib/auth/dal";
import { getShiftsAction } from "@/actions/shifts";
import { getLocationsAction } from "@/actions/locations";
import { getEmployeesAction } from "@/actions/employees";
import { ShiftsPage } from "@/components/shifts/shifts-page";
import type { ShiftWithAssignmentCount } from "@/lib/validations/shift";
import type { Location } from "@/lib/validations/location";
import type { Employee } from "@/lib/validations/employee";

export const metadata = {
  title: "Shifts -- Kunoz",
};

export default async function ShiftsRoute() {
  await requireRole("admin", "hr_officer");

  const [shifts, locations, employees] = await Promise.all([
    getShiftsAction(),
    getLocationsAction(),
    getEmployeesAction(),
  ]);

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <ShiftsPage
        shifts={(shifts as ShiftWithAssignmentCount[]) ?? []}
        locations={(locations as Location[]) ?? []}
        employees={(employees as Employee[]) ?? []}
      />
    </div>
  );
}

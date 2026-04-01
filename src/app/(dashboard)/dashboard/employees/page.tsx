import { requireRole } from "@/lib/auth/dal";
import { getEmployeesAction } from "@/actions/employees";
import { getLocationsAction } from "@/actions/locations";
import { EmployeesPage } from "@/components/employees/employees-page";
import type { EmployeeFilters, EmployeeWithLocation } from "@/lib/validations/employee";
import type { Location } from "@/lib/validations/location";

type SearchParams = Promise<{
  location?: string;
  department?: string;
  status?: string;
  search?: string;
}>;

export const metadata = {
  title: "Employees -- Kunoz",
};

export default async function EmployeesRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin", "hr_officer", "supervisor");
  const params = await searchParams;

  // Build filters from URL search params
  const filters: EmployeeFilters = {};
  if (params.location) filters.locationId = params.location;
  if (params.department) filters.department = params.department;
  if (params.status === "active") filters.isActive = true;
  if (params.status === "inactive") filters.isActive = false;
  if (params.search) filters.search = params.search;

  const [employees, locations] = await Promise.all([
    getEmployeesAction(filters),
    getLocationsAction(),
  ]);

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <EmployeesPage
        employees={(employees as EmployeeWithLocation[]) ?? []}
        locations={(locations as Location[]) ?? []}
        initialFilters={params}
      />
    </div>
  );
}

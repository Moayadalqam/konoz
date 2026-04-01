import { requireRole } from "@/lib/auth/dal";
import { getLocationsWithCountsAction } from "@/actions/locations";
import { LocationsPage } from "@/components/locations/locations-page";

export const metadata = {
  title: "Locations — Kunoz",
};

export default async function LocationsRoute() {
  await requireRole("admin", "hr_officer");

  const locations = await getLocationsWithCountsAction();

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <LocationsPage locations={locations} />
    </div>
  );
}

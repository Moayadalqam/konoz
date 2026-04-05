import { requireRole } from "@/lib/auth/dal";
import { getLocationAttendanceAction } from "@/actions/supervisor";
import { LocationEmployees } from "@/components/locations/location-employees";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("admin", "hr_officer");

  const supabase = await createClient();
  const { data: location } = await supabase
    .from("locations")
    .select("id, name, city")
    .eq("id", id)
    .single();

  if (!location) notFound();

  const employees = await getLocationAttendanceAction(id);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <LocationEmployees
        employees={employees}
        locationName={location.name}
        locationCity={location.city}
      />
    </div>
  );
}

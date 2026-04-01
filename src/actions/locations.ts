"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { locationSchema, type LocationFormData } from "@/lib/validations/location";

export async function createLocationAction(data: LocationFormData) {
  await requireRole("admin", "hr_officer");

  const parsed = locationSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  const { error } = await supabase.from("locations").insert({
    name: parsed.data.name,
    city: parsed.data.city,
    address: parsed.data.address || null,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    geofence_radius_meters: parsed.data.geofence_radius_meters,
    google_maps_url: parsed.data.google_maps_url || null,
    is_active: parsed.data.is_active,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/locations");
}

export async function updateLocationAction(id: string, data: LocationFormData) {
  await requireRole("admin", "hr_officer");

  if (!id) throw new Error("Invalid location ID");

  const parsed = locationSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("locations")
    .update({
      name: parsed.data.name,
      city: parsed.data.city,
      address: parsed.data.address || null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      geofence_radius_meters: parsed.data.geofence_radius_meters,
      google_maps_url: parsed.data.google_maps_url || null,
      is_active: parsed.data.is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/locations");
}

export async function deleteLocationAction(id: string) {
  await requireRole("admin");

  if (!id) throw new Error("Invalid location ID");

  const supabase = await createClient();

  const { error } = await supabase
    .from("locations")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/locations");
}

export async function getLocationsAction() {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getLocationsWithCountsAction() {
  await requireAuth();
  const supabase = await createClient();

  const { data: locations, error } = await supabase
    .from("locations")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);

  // Get employee counts per location
  const { data: counts } = await supabase
    .from("employees")
    .select("primary_location_id")
    .eq("is_active", true);

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    if (row.primary_location_id) {
      countMap.set(
        row.primary_location_id,
        (countMap.get(row.primary_location_id) ?? 0) + 1
      );
    }
  }

  return locations.map((loc) => ({
    ...loc,
    employee_count: countMap.get(loc.id) ?? 0,
  }));
}

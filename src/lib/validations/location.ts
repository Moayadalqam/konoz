import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  address: z.string().max(500).optional().or(z.literal("")),
  latitude: z.number().min(-90, "Invalid latitude").max(90, "Invalid latitude"),
  longitude: z
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
  geofence_radius_meters: z
    .number()
    .int()
    .min(50, "Minimum radius is 50m")
    .max(5000, "Maximum radius is 5000m")
    .default(200),
  google_maps_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export type LocationFormData = z.infer<typeof locationSchema>;

export interface Location {
  id: string;
  name: string;
  name_ar: string | null;
  city: string;
  address: string | null;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  google_maps_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationWithCount extends Location {
  employee_count: number;
}

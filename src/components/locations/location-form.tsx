"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createLocationAction,
  updateLocationAction,
} from "@/actions/locations";
import { locationSchema } from "@/lib/validations/location";
import type { Location } from "@/lib/validations/location";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("./location-picker"),
  { ssr: false }
);

interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location | null;
  onSuccess?: () => void;
}

export function LocationForm({
  open,
  onOpenChange,
  location,
  onSuccess,
}: LocationFormProps) {
  const isEdit = !!location;
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(location?.name ?? "");
  const [city, setCity] = useState(location?.city ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [latitude, setLatitude] = useState(location?.latitude ?? 24.7136);
  const [longitude, setLongitude] = useState(location?.longitude ?? 46.6753);
  const [radius, setRadius] = useState(
    location?.geofence_radius_meters ?? 200
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    location?.google_maps_url ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleMapClick(lat: number, lng: number) {
    setLatitude(lat);
    setLongitude(lng);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const data = {
      name,
      city,
      address: address || undefined,
      latitude,
      longitude,
      geofence_radius_meters: radius,
      google_maps_url: googleMapsUrl || undefined,
      is_active: location?.is_active ?? true,
    };

    const parsed = locationSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && location) {
          await updateLocationAction(location.id, parsed.data);
          toast.success("Location updated");
        } else {
          await createLocationAction(parsed.data);
          toast.success("Location created");
        }
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Location" : "Add Location"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the location details below."
              : "Enter the details for the new location. Click on the map to set coordinates."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Head Office"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Riyadh"
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional street address"
            />
          </div>

          {/* Map picker */}
          <div className="space-y-2">
            <Label>Location on Map (click to set)</Label>
            <div className="h-48 overflow-hidden rounded-lg border border-border">
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                radius={radius}
                onMapClick={handleMapClick}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
              />
              {errors.latitude && (
                <p className="text-xs text-destructive">{errors.latitude}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
              />
              {errors.longitude && (
                <p className="text-xs text-destructive">{errors.longitude}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Geofence (m)</Label>
              <Input
                id="radius"
                type="number"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value) || 200)}
                min={50}
                max={5000}
              />
              {errors.geofence_radius_meters && (
                <p className="text-xs text-destructive">
                  {errors.geofence_radius_meters}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_maps_url">Google Maps URL</Label>
            <Input
              id="google_maps_url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
            />
            {errors.google_maps_url && (
              <p className="text-xs text-destructive">
                {errors.google_maps_url}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Location"
                  : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

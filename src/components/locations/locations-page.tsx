"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationList } from "@/components/locations/location-list";
import { LocationForm } from "@/components/locations/location-form";
import type { Location, LocationWithCount } from "@/lib/validations/location";

const LocationMap = dynamic(
  () =>
    import("@/components/locations/location-map").then(
      (mod) => mod.LocationMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MapPin className="size-6 animate-pulse" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    ),
  }
);

interface LocationsPageProps {
  locations: LocationWithCount[];
}

export function LocationsPage({ locations }: LocationsPageProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const activeCount = locations.filter((l) => l.is_active).length;
  const totalEmployees = locations.reduce(
    (sum, l) => sum + l.employee_count,
    0
  );

  function handleEdit(location: LocationWithCount) {
    setEditingLocation(location);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditingLocation(null);
    setFormOpen(true);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Locations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCount} active location{activeCount !== 1 ? "s" : ""} across{" "}
            {totalEmployees} employee{totalEmployees !== 1 ? "s" : ""}
          </p>
        </div>
        <Button className="gap-1.5 self-start sm:self-auto" onClick={handleAdd}>
          <Plus className="size-4" data-icon="inline-start" />
          Add Location
        </Button>
      </div>

      {/* Map + List layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Map panel */}
        <div className="h-[300px] w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 lg:h-[calc(100vh-220px)] lg:min-h-[500px] lg:w-[60%]">
          <LocationMap locations={locations} />
        </div>

        {/* List panel */}
        <div className="w-full lg:w-[40%]">
          <LocationList locations={locations} onEdit={handleEdit} />
        </div>
      </div>

      {/* Create/Edit dialog */}
      <LocationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        location={editingLocation}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

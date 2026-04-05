"use client";

import Link from "next/link";
import { ExternalLink, Pencil, MapPin, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LocationWithCount } from "./locations-page";

interface LocationListProps {
  locations: LocationWithCount[];
  onEdit?: (location: LocationWithCount) => void;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
        Active
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700/50 dark:bg-slate-900/40 dark:text-slate-400"
    >
      <span className="mr-1 inline-block size-1.5 rounded-full bg-slate-400" />
      Inactive
    </Badge>
  );
}

function formatRadius(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

// ─── Mobile Card ────────────────────────────────────────────────────────────

function LocationCard({ location, onEdit }: { location: LocationWithCount; onEdit?: (location: LocationWithCount) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-card dark:border-slate-700 overflow-hidden">
      {/* Tappable area — links to employee list */}
      <Link
        href={`/dashboard/locations/${location.id}`}
        className="block p-4 transition-colors hover:bg-muted/30 active:bg-muted/50"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading font-semibold text-foreground">
              {location.name}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {location.city}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {location.employee_count} employee{location.employee_count !== 1 ? "s" : ""}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground/40" />
        </div>
      </Link>

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-2.5 dark:border-slate-700">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => onEdit?.(location)}>
          <Pencil className="size-3" data-icon="inline-start" />
          Edit
        </Button>
        {location.google_maps_url && (
          <a
            href={location.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-3" />
            Maps
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function LocationList({ locations, onEdit }: LocationListProps) {
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-muted/30 py-16 dark:border-slate-600">
        <MapPin className="mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          No locations yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Add your first work location to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="text-center">Employees</TableHead>
              <TableHead>Radius</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location, idx) => (
              <TableRow
                key={location.id}
                className={`cursor-pointer ${
                  idx % 2 === 1 ? "bg-muted/20 hover:bg-muted/40" : "hover:bg-muted/20"
                }`}
                onClick={() => window.location.href = `/dashboard/locations/${location.id}`}
              >
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {location.city}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {location.employee_count}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatRadius(location.geofence_radius_meters)}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={location.is_active} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-xs" title="Edit" onClick={() => onEdit?.(location)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    {location.google_maps_url && (
                      <a
                        href={location.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Google Maps"
                        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {locations.map((location) => (
          <LocationCard key={location.id} location={location} onEdit={onEdit} />
        ))}
      </div>

      {/* Count */}
      <p className="mt-3 text-xs text-muted-foreground">
        {locations.length} location{locations.length !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}

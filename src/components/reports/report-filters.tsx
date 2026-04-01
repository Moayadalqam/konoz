"use client";

import { useState, useCallback } from "react";
import { Calendar, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportFiltersProps {
  onFilterChange: (filters: {
    from: string;
    to: string;
    locationId?: string;
  }) => void;
  locations: { id: string; name: string }[];
  defaultRange?: { from: string; to: string };
}

function getDefaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function ReportFilters({
  onFilterChange,
  locations,
  defaultRange,
}: ReportFiltersProps) {
  const range = defaultRange ?? getDefaultRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);

  const emitChange = useCallback(
    (newFrom: string, newTo: string, newLoc?: string) => {
      onFilterChange({
        from: newFrom,
        to: newTo,
        locationId: newLoc,
      });
    },
    [onFilterChange]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      {/* Date From */}
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Calendar className="size-3" />
          From
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            emitChange(e.target.value, to, locationId);
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Date To */}
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Calendar className="size-3" />
          To
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            emitChange(from, e.target.value, locationId);
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3" />
          Location
        </label>
        <Select
          value={locationId ?? "__all__"}
          onValueChange={(val) => {
            const loc = !val || val === "__all__" ? undefined : val;
            setLocationId(loc);
            emitChange(from, to, loc);
          }}
        >
          <SelectTrigger className="min-w-[160px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

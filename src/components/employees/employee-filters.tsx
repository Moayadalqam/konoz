"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS } from "@/lib/validations/employee";
import type { Location } from "@/lib/validations/location";

// ---- Types ----------------------------------------------------------------

type StatusFilter = "all" | "active" | "inactive";

interface EmployeeFiltersProps {
  locations: Location[];
  initialFilters: {
    location?: string;
    department?: string;
    status?: string;
    search?: string;
  };
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ---- Component -------------------------------------------------------------

export function EmployeeFilters({
  locations,
  initialFilters,
}: EmployeeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(initialFilters.search ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive current filters from URL
  const currentLocation = searchParams.get("location") ?? "";
  const currentDepartment = searchParams.get("department") ?? "";
  const currentStatus = (searchParams.get("status") as StatusFilter) ?? "all";

  const hasActiveFilters =
    currentLocation || currentDepartment || currentStatus !== "all" || searchValue;

  // Push updated params to the URL
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "" || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      startTransition(() => {
        router.push(`/dashboard/employees?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const currentSearch = searchParams.get("search") ?? "";
      if (searchValue !== currentSearch) {
        updateParams({ search: searchValue || null });
      }
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchValue, searchParams, updateParams]);

  function clearAll() {
    setSearchValue("");
    startTransition(() => {
      router.push("/dashboard/employees");
    });
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or number..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Location select */}
        <Select
          value={currentLocation || undefined}
          onValueChange={(val) => updateParams({ location: val === "__all__" ? null : val })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All locations</SelectItem>
            {locations
              .filter((loc) => loc.is_active)
              .map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Department select */}
        <Select
          value={currentDepartment || undefined}
          onValueChange={(val) => updateParams({ department: val === "__all__" ? null : val })}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All departments</SelectItem>
            {DEPARTMENTS.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams({ status: opt.value })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                currentStatus === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useTransition } from "react";
import {
  CalendarDays,
  Users,
  Clock,
  Timer,
  UserX,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportFilters } from "./report-filters";
import { DailyTab } from "./daily-tab";
import { SummaryTab } from "./summary-tab";
import { LateTab } from "./late-tab";
import { OvertimeTab } from "./overtime-tab";
import { AbsencesTab } from "./absences-tab";
import { SitesTab } from "./sites-tab";

import {
  getDailyAttendanceReport,
  getEmployeeSummaryReport,
  getLateArrivalsReport,
  getOvertimeReport,
  getAbsenceReport,
  getSiteComparisonReport,
} from "@/actions/reports";

import type {
  DailyAttendanceReport,
  EmployeeSummaryRow,
  LateArrivalRow,
  OvertimeReport,
  AbsenceRow,
  SiteComparisonRow,
} from "@/lib/validations/reports";

// ── Types ──

type TabId = "daily" | "summary" | "late" | "overtime" | "absences" | "sites";

interface TabDef {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof CalendarDays;
}

const TABS: TabDef[] = [
  { id: "daily", label: "Daily", shortLabel: "Daily", icon: CalendarDays },
  { id: "summary", label: "Employee Summary", shortLabel: "Summary", icon: Users },
  { id: "late", label: "Late Arrivals", shortLabel: "Late", icon: Clock },
  { id: "overtime", label: "Overtime", shortLabel: "OT", icon: Timer },
  { id: "absences", label: "Absences", shortLabel: "Absent", icon: UserX },
  { id: "sites", label: "Site Comparison", shortLabel: "Sites", icon: Building2 },
];

// ── Daily Date Picker ──

function DailyDatePicker({
  date,
  onChange,
  locations,
  locationId,
  onLocationChange,
}: {
  date: string;
  onChange: (d: string) => void;
  locations: { id: string; name: string }[];
  locationId?: string;
  onLocationChange: (locId?: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-3" />
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Building2 className="size-3" />
          Location
        </label>
        <select
          value={locationId ?? "__all__"}
          onChange={(e) =>
            onLocationChange(e.target.value === "__all__" ? undefined : e.target.value)
          }
          className="h-8 min-w-[160px] rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="__all__">All Locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Main Component ──

interface ReportsPageProps {
  locations: { id: string; name: string }[];
}

export function ReportsPage({ locations }: ReportsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("daily");
  const [isPending, startTransition] = useTransition();

  const defaultRange = getDefaultRange();
  const [filters, setFilters] = useState({
    from: defaultRange.from,
    to: defaultRange.to,
    locationId: undefined as string | undefined,
  });

  const [dailyData, setDailyData] = useState<DailyAttendanceReport | null>(null);
  const [summaryData, setSummaryData] = useState<EmployeeSummaryRow[] | null>(null);
  const [lateData, setLateData] = useState<LateArrivalRow[] | null>(null);
  const [overtimeData, setOvertimeData] = useState<OvertimeReport | null>(null);
  const [absenceData, setAbsenceData] = useState<AbsenceRow[] | null>(null);
  const [sitesData, setSitesData] = useState<SiteComparisonRow[] | null>(null);

  const [dailyDate, setDailyDate] = useState(defaultRange.to);

  const fetchTab = useCallback(
    (tab: TabId, f = filters, date = dailyDate) => {
      startTransition(async () => {
        try {
          switch (tab) {
            case "daily": { setDailyData(await getDailyAttendanceReport(date, f.locationId)); break; }
            case "summary": { setSummaryData(await getEmployeeSummaryReport(f.from, f.to, undefined, f.locationId)); break; }
            case "late": { setLateData(await getLateArrivalsReport(f.from, f.to, f.locationId)); break; }
            case "overtime": { setOvertimeData(await getOvertimeReport(f.from, f.to, f.locationId)); break; }
            case "absences": { setAbsenceData(await getAbsenceReport(f.from, f.to, f.locationId)); break; }
            case "sites": { setSitesData(await getSiteComparisonReport(f.from, f.to)); break; }
          }
        } catch (err) {
          console.error("Failed to fetch report:", err);
        }
      });
    },
    [filters, dailyDate]
  );

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    fetchTab(tab);
  }

  function handleFilterChange(newFilters: { from: string; to: string; locationId?: string }) {
    const normalized = { from: newFilters.from, to: newFilters.to, locationId: newFilters.locationId ?? undefined };
    setFilters(normalized);
    fetchTab(activeTab, normalized);
  }

  function handleDailyDateChange(date: string) {
    setDailyDate(date);
    fetchTab("daily", filters, date);
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Attendance analytics and workforce insights</p>
      </div>

      <div className="mb-6 -mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
        <div className="inline-flex min-w-full gap-1 border-b border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        {activeTab === "daily" ? (
          <DailyDatePicker
            date={dailyDate}
            onChange={handleDailyDateChange}
            locations={locations}
            locationId={filters.locationId}
            onLocationChange={(locId) => {
              const newFilters = { ...filters, locationId: locId };
              setFilters(newFilters);
              fetchTab("daily", newFilters, dailyDate);
            }}
          />
        ) : (
          <ReportFilters
            locations={locations}
            defaultRange={{ from: filters.from, to: filters.to }}
            onFilterChange={handleFilterChange}
          />
        )}
      </div>

      {isPending && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading report data...
        </div>
      )}

      <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
        {activeTab === "daily" && <DailyTab data={dailyData} />}
        {activeTab === "summary" && <SummaryTab data={summaryData} />}
        {activeTab === "late" && <LateTab data={lateData} />}
        {activeTab === "overtime" && <OvertimeTab data={overtimeData} />}
        {activeTab === "absences" && <AbsencesTab data={absenceData} />}
        {activeTab === "sites" && <SitesTab data={sitesData} />}
      </div>
    </div>
  );
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

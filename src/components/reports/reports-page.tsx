"use client";

import { useState, useCallback, useTransition } from "react";
import {
  CalendarDays,
  Users,
  Clock,
  Timer,
  UserX,
  Building2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "./export-button";
import { ReportFilters } from "./report-filters";
import dynamic from "next/dynamic";

const SiteComparisonChart = dynamic(
  () => import("./site-comparison-chart").then((m) => m.SiteComparisonChart),
  { ssr: false }
);

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

// ── Helpers ──

function formatDateDisplay(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function minutesToDisplay(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// ── Types ──

type TabId =
  | "daily"
  | "summary"
  | "late"
  | "overtime"
  | "absences"
  | "sites";

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

// ── Main Component ──

interface ReportsPageProps {
  locations: { id: string; name: string }[];
}

export function ReportsPage({ locations }: ReportsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("daily");
  const [isPending, startTransition] = useTransition();

  // Filter state
  const defaultRange = getDefaultRange();
  const [filters, setFilters] = useState({
    from: defaultRange.from,
    to: defaultRange.to,
    locationId: undefined as string | undefined,
  });

  // Data per tab
  const [dailyData, setDailyData] = useState<DailyAttendanceReport | null>(null);
  const [summaryData, setSummaryData] = useState<EmployeeSummaryRow[] | null>(null);
  const [lateData, setLateData] = useState<LateArrivalRow[] | null>(null);
  const [overtimeData, setOvertimeData] = useState<OvertimeReport | null>(null);
  const [absenceData, setAbsenceData] = useState<AbsenceRow[] | null>(null);
  const [sitesData, setSitesData] = useState<SiteComparisonRow[] | null>(null);

  // Daily tab uses single date
  const [dailyDate, setDailyDate] = useState(defaultRange.to);

  const fetchTab = useCallback(
    (tab: TabId, f = filters, date = dailyDate) => {
      startTransition(async () => {
        try {
          switch (tab) {
            case "daily": {
              const result = await getDailyAttendanceReport(date, f.locationId);
              setDailyData(result);
              break;
            }
            case "summary": {
              const result = await getEmployeeSummaryReport(f.from, f.to, undefined, f.locationId);
              setSummaryData(result);
              break;
            }
            case "late": {
              const result = await getLateArrivalsReport(f.from, f.to, f.locationId);
              setLateData(result);
              break;
            }
            case "overtime": {
              const result = await getOvertimeReport(f.from, f.to, f.locationId);
              setOvertimeData(result);
              break;
            }
            case "absences": {
              const result = await getAbsenceReport(f.from, f.to, f.locationId);
              setAbsenceData(result);
              break;
            }
            case "sites": {
              const result = await getSiteComparisonReport(f.from, f.to);
              setSitesData(result);
              break;
            }
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
    const normalized = {
      from: newFilters.from,
      to: newFilters.to,
      locationId: newFilters.locationId ?? undefined,
    };
    setFilters(normalized);
    fetchTab(activeTab, normalized);
  }

  function handleDailyDateChange(date: string) {
    setDailyDate(date);
    fetchTab("daily", filters, date);
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attendance analytics and workforce insights
        </p>
      </div>

      {/* Tab navigation */}
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
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
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

      {/* Filters */}
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

      {/* Loading indicator */}
      {isPending && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading report data...
        </div>
      )}

      {/* Tab content */}
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

// ── Empty State ──

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center gap-3">
          <BarChart3 className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Daily Tab ──

function DailyTab({ data }: { data: DailyAttendanceReport | null }) {
  if (!data) {
    return <EmptyState message="Select a date to load the daily attendance report" />;
  }

  if (!data.sites.length) {
    return <EmptyState message="No attendance data for this date" />;
  }

  const exportData = data.sites.map((s) => ({
    locationName: s.locationName,
    present: s.present,
    late: s.late,
    earlyDeparture: s.earlyDeparture,
    absent: s.absent,
    onLeave: s.onLeave,
    total: s.total,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Daily Attendance &mdash; {formatDateDisplay(data.date)}
          </CardTitle>
          <ExportButton
            data={exportData}
            columns={[
              { key: "locationName", header: "Location" },
              { key: "present", header: "Present" },
              { key: "late", header: "Late" },
              { key: "earlyDeparture", header: "Early Departure" },
              { key: "absent", header: "Absent" },
              { key: "onLeave", header: "On Leave" },
              { key: "total", header: "Total" },
            ]}
            filename="daily-attendance"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Present</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead className="text-right">Early Dep.</TableHead>
              <TableHead className="text-right">Absent</TableHead>
              <TableHead className="text-right">On Leave</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.sites.map((site) => (
              <TableRow key={site.locationId} className="even:bg-muted/50">
                <TableCell className="font-medium">{site.locationName}</TableCell>
                <TableCell className="text-right font-mono text-emerald-600">{site.present}</TableCell>
                <TableCell className="text-right font-mono text-amber-600">{site.late}</TableCell>
                <TableCell className="text-right font-mono text-orange-600">{site.earlyDeparture}</TableCell>
                <TableCell className="text-right font-mono text-red-600">{site.absent}</TableCell>
                <TableCell className="text-right font-mono text-blue-600">{site.onLeave}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{site.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Totals</TableCell>
              <TableCell className="text-right font-mono font-semibold text-emerald-600">{data.totals.present}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-amber-600">{data.totals.late}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-orange-600">{data.totals.earlyDeparture}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-red-600">{data.totals.absent}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-blue-600">{data.totals.onLeave}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{data.totals.total}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Employee Summary Tab ──

function SummaryTab({ data }: { data: EmployeeSummaryRow[] | null }) {
  if (!data) {
    return <EmptyState message="Select a date range to load the employee summary" />;
  }

  if (!data.length) {
    return <EmptyState message="No employee data for this period" />;
  }

  const exportData = data.map((r) => ({
    employeeName: r.employeeName,
    employeeNumber: r.employeeNumber,
    locationName: r.locationName,
    daysWorked: r.daysWorked,
    totalHours: r.totalHours,
    overtimeHours: r.overtimeHours,
    absences: r.absences,
    lateCount: r.lateCount,
    earlyDepartureCount: r.earlyDepartureCount,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Employee Summary ({data.length} employees)
          </CardTitle>
          <ExportButton
            data={exportData}
            columns={[
              { key: "employeeName", header: "Name" },
              { key: "employeeNumber", header: "Employee #" },
              { key: "locationName", header: "Location" },
              { key: "daysWorked", header: "Days Worked" },
              { key: "totalHours", header: "Total Hours" },
              { key: "overtimeHours", header: "OT Hours" },
              { key: "absences", header: "Absences" },
              { key: "lateCount", header: "Late" },
              { key: "earlyDepartureCount", header: "Early Dep." },
            ]}
            filename="employee-summary"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>ID #</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">OT</TableHead>
              <TableHead className="text-right">Absences</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead className="text-right">Early Dep.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.employeeId} className="even:bg-muted/50">
                <TableCell className="font-medium">{row.employeeName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{row.employeeNumber}</TableCell>
                <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                <TableCell className="text-right font-mono">{row.daysWorked}</TableCell>
                <TableCell className="text-right font-mono">{row.totalHours}</TableCell>
                <TableCell className="text-right font-mono text-purple-600">
                  {row.overtimeHours > 0 ? row.overtimeHours : "\u2014"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.absences > 0 ? (
                    <span className="text-red-600">{row.absences}</span>
                  ) : (
                    <span className="text-muted-foreground">\u2014</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.lateCount > 0 ? (
                    <span className="text-amber-600">{row.lateCount}</span>
                  ) : (
                    <span className="text-muted-foreground">\u2014</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.earlyDepartureCount > 0 ? (
                    <span className="text-orange-600">{row.earlyDepartureCount}</span>
                  ) : (
                    <span className="text-muted-foreground">\u2014</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Late Arrivals Tab ──

function LateTab({ data }: { data: LateArrivalRow[] | null }) {
  if (!data) {
    return <EmptyState message="Select a date range to load the late arrivals report" />;
  }

  if (!data.length) {
    return <EmptyState message="No late arrivals in this period" />;
  }

  const exportData = data.map((r) => ({
    employeeName: r.employeeName,
    employeeNumber: r.employeeNumber,
    locationName: r.locationName,
    lateCount: r.lateCount,
    dates: r.dates.join(", "),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Late Arrivals ({data.length} employees)
          </CardTitle>
          <ExportButton
            data={exportData}
            columns={[
              { key: "employeeName", header: "Name" },
              { key: "employeeNumber", header: "Employee #" },
              { key: "locationName", header: "Location" },
              { key: "lateCount", header: "Late Count" },
              { key: "dates", header: "Dates" },
            ]}
            filename="late-arrivals"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>ID #</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead>Dates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.employeeId} className="even:bg-muted/50">
                <TableCell className="font-medium">{row.employeeName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{row.employeeNumber}</TableCell>
                <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={row.lateCount >= 5 ? "destructive" : "secondary"}
                    className="font-mono"
                  >
                    {row.lateCount}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.dates.slice(0, 5).map((d) => (
                      <span
                        key={d}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                      >
                        {formatDateDisplay(d)}
                      </span>
                    ))}
                    {row.dates.length > 5 && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        +{row.dates.length - 5} more
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Overtime Tab ──

function OvertimeTab({ data }: { data: OvertimeReport | null }) {
  if (!data) {
    return <EmptyState message="Select a date range to load the overtime report" />;
  }

  if (!data.byEmployee.length && !data.bySite.length) {
    return <EmptyState message="No overtime recorded in this period" />;
  }

  const employeeExport = data.byEmployee.map((r) => ({
    employeeName: r.employeeName,
    employeeNumber: r.employeeNumber,
    locationName: r.locationName,
    overtimeHours: Math.round((r.totalOvertimeMinutes / 60) * 10) / 10,
    recordCount: r.recordCount,
    status: r.overtimeStatus,
  }));

  const siteExport = data.bySite.map((r) => ({
    locationName: r.locationName,
    overtimeHours: Math.round((r.totalOvertimeMinutes / 60) * 10) / 10,
    employeeCount: r.employeeCount,
  }));

  const statusStyles: Record<string, string> = {
    approved: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
    pending: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
    rejected: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
    mixed: "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/40",
  };

  return (
    <div className="space-y-6">
      {/* By Employee */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">By Employee</CardTitle>
            <ExportButton
              data={employeeExport}
              columns={[
                { key: "employeeName", header: "Name" },
                { key: "employeeNumber", header: "Employee #" },
                { key: "locationName", header: "Location" },
                { key: "overtimeHours", header: "OT Hours" },
                { key: "recordCount", header: "Records" },
                { key: "status", header: "Status" },
              ]}
              filename="overtime-employees"
            />
          </div>
        </CardHeader>
        <CardContent>
          {data.byEmployee.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead>ID #</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Overtime</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byEmployee.map((row) => (
                  <TableRow key={row.employeeId} className="even:bg-muted/50">
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.employeeNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-purple-600">
                      {minutesToDisplay(row.totalOvertimeMinutes)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.recordCount}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          statusStyles[row.overtimeStatus] ?? ""
                        )}
                      >
                        {row.overtimeStatus}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No employee overtime data
            </p>
          )}
        </CardContent>
      </Card>

      {/* By Site */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">By Site</CardTitle>
            <ExportButton
              data={siteExport}
              columns={[
                { key: "locationName", header: "Location" },
                { key: "overtimeHours", header: "OT Hours" },
                { key: "employeeCount", header: "Employees" },
              ]}
              filename="overtime-sites"
            />
          </div>
        </CardHeader>
        <CardContent>
          {data.bySite.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Overtime</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bySite.map((row) => (
                  <TableRow key={row.locationId} className="even:bg-muted/50">
                    <TableCell className="font-medium">{row.locationName}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-purple-600">
                      {minutesToDisplay(row.totalOvertimeMinutes)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.employeeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No site overtime data
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Absences Tab ──

function AbsencesTab({ data }: { data: AbsenceRow[] | null }) {
  if (!data) {
    return <EmptyState message="Select a date range to load the absence report" />;
  }

  if (!data.length) {
    return <EmptyState message="No absences in this period" />;
  }

  const exportData = data.map((r) => ({
    employeeName: r.employeeName,
    employeeNumber: r.employeeNumber,
    locationName: r.locationName,
    absenceCount: r.absenceCount,
    consecutiveMax: r.consecutiveMax,
    dates: r.dates.join(", "),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Absences ({data.length} employees)
          </CardTitle>
          <ExportButton
            data={exportData}
            columns={[
              { key: "employeeName", header: "Name" },
              { key: "employeeNumber", header: "Employee #" },
              { key: "locationName", header: "Location" },
              { key: "absenceCount", header: "Total Absences" },
              { key: "consecutiveMax", header: "Max Consecutive" },
              { key: "dates", header: "Dates" },
            ]}
            filename="absences"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>ID #</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Absences</TableHead>
              <TableHead className="text-right">Max Consec.</TableHead>
              <TableHead>Dates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.employeeId} className="even:bg-muted/50">
                <TableCell className="font-medium">{row.employeeName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{row.employeeNumber}</TableCell>
                <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={row.absenceCount >= 5 ? "destructive" : "secondary"}
                    className="font-mono"
                  >
                    {row.absenceCount}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.consecutiveMax >= 3 ? (
                    <span className="font-semibold text-red-600">{row.consecutiveMax}</span>
                  ) : (
                    row.consecutiveMax
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.dates.slice(0, 5).map((d) => (
                      <span
                        key={d}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                      >
                        {formatDateDisplay(d)}
                      </span>
                    ))}
                    {row.dates.length > 5 && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        +{row.dates.length - 5} more
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Site Comparison Tab ──

function SitesTab({ data }: { data: SiteComparisonRow[] | null }) {
  if (!data) {
    return <EmptyState message="Select a date range to load the site comparison" />;
  }

  if (!data.length) {
    return <EmptyState message="No site data available" />;
  }

  const exportData = data.map((r) => ({
    locationName: r.locationName,
    city: r.city,
    totalEmployees: r.totalEmployees,
    attendanceRate: r.attendanceRate,
    avgHoursPerDay: r.avgHoursPerDay,
    totalOvertimeHours: r.totalOvertimeHours,
    lateCount: r.lateCount,
    absenceCount: r.absenceCount,
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance Rate by Site</CardTitle>
        </CardHeader>
        <CardContent>
          <SiteComparisonChart data={data} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              Site Details ({data.length} locations)
            </CardTitle>
            <ExportButton
              data={exportData}
              columns={[
                { key: "locationName", header: "Location" },
                { key: "city", header: "City" },
                { key: "totalEmployees", header: "Employees" },
                { key: "attendanceRate", header: "Attendance %" },
                { key: "avgHoursPerDay", header: "Avg Hrs/Day" },
                { key: "totalOvertimeHours", header: "OT Hours" },
                { key: "lateCount", header: "Late" },
                { key: "absenceCount", header: "Absences" },
              ]}
              filename="site-comparison"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Location</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
                <TableHead className="text-right">Avg Hrs/Day</TableHead>
                <TableHead className="text-right">OT Hours</TableHead>
                <TableHead className="text-right">Late</TableHead>
                <TableHead className="text-right">Absences</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.locationId} className="even:bg-muted/50">
                  <TableCell className="font-medium">{row.locationName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.city}</TableCell>
                  <TableCell className="text-right font-mono">{row.totalEmployees}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        row.attendanceRate >= 90
                          ? "text-emerald-600"
                          : row.attendanceRate >= 75
                            ? "text-foreground"
                            : row.attendanceRate >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                      )}
                    >
                      {row.attendanceRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{row.avgHoursPerDay}h</TableCell>
                  <TableCell className="text-right font-mono text-purple-600">
                    {row.totalOvertimeHours > 0 ? `${row.totalOvertimeHours}h` : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.lateCount > 0 ? (
                      <span className="text-amber-600">{row.lateCount}</span>
                    ) : (
                      <span className="text-muted-foreground">\u2014</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.absenceCount > 0 ? (
                      <span className="text-red-600">{row.absenceCount}</span>
                    ) : (
                      <span className="text-muted-foreground">\u2014</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

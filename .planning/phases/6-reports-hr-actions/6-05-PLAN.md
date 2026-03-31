---
phase: 6-reports-hr-actions
plan: 05
type: execute
wave: 3
depends_on: ["6-03"]
files_modified:
  - src/lib/reports/export-xlsx.ts
  - src/components/reports/report-filters.tsx
  - src/components/reports/attendance-trend-chart.tsx
  - src/components/reports/daily-attendance-table.tsx
  - src/components/reports/employee-summary-table.tsx
  - src/components/reports/late-arrivals-table.tsx
  - src/components/reports/site-comparison-chart.tsx
  - src/components/reports/export-button.tsx
  - src/app/(dashboard)/dashboard/reports/page.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Reports page loads at /dashboard/reports with tab navigation for all report types"
    - "Date range and location filters work on all report tables"
    - "Charts render with recharts using Kunoz design system colors"
    - "Export button generates .xlsx file containing the visible report data"
    - "Daily attendance table shows per-employee status with color-coded badges"
    - "Employee summary shows total hours, overtime, absences in a sortable table"
    - "Late arrivals shows both individual records and frequency analysis"
    - "Site comparison shows bar chart of attendance rates across all locations"
  artifacts:
    - path: "src/app/(dashboard)/dashboard/reports/page.tsx"
      provides: "Reports page with tab navigation and data fetching"
      min_lines: 40
    - path: "src/components/reports/report-filters.tsx"
      provides: "Reusable date range + location filter bar"
      min_lines: 60
    - path: "src/components/reports/attendance-trend-chart.tsx"
      provides: "Recharts area chart for attendance trends (RPT-01)"
      min_lines: 40
    - path: "src/components/reports/daily-attendance-table.tsx"
      provides: "Table component for daily attendance report (RPT-02)"
      min_lines: 80
    - path: "src/components/reports/employee-summary-table.tsx"
      provides: "Table component for employee summary report (RPT-03)"
      min_lines: 60
    - path: "src/components/reports/late-arrivals-table.tsx"
      provides: "Late arrivals table + frequency cards (RPT-04)"
      min_lines: 60
    - path: "src/components/reports/site-comparison-chart.tsx"
      provides: "Bar chart comparing site metrics (RPT-08)"
      min_lines: 40
    - path: "src/components/reports/export-button.tsx"
      provides: "Client-side XLSX export button using SheetJS"
      min_lines: 30
    - path: "src/lib/reports/export-xlsx.ts"
      provides: "Excel export utility functions"
      min_lines: 40
  key_links:
    - from: "src/app/(dashboard)/dashboard/reports/page.tsx"
      to: "src/actions/reports.ts"
      via: "server component calls report actions"
      pattern: "import.*from.*actions/reports"
    - from: "src/components/reports/attendance-trend-chart.tsx"
      to: "recharts"
      via: "imports chart components"
      pattern: "import.*from.*recharts"
    - from: "src/lib/reports/export-xlsx.ts"
      to: "xlsx"
      via: "uses SheetJS for workbook generation"
      pattern: "import.*from.*xlsx"
---

<objective>
Build the complete reports UI: tabbed reports page, filter components, data tables, charts (recharts), and Excel export (xlsx).

Purpose: This is the user-facing layer for RPT-01 through RPT-08. HR officers and admins can view all reports, filter by date/location, and export to Excel.
Output: Reports page at /dashboard/reports with 6 tabs (Trends, Daily, Summary, Late, Overtime, Absence, Site Comparison), each with its data table/chart and export capability.
</objective>

<execution_context>
@/home/moayadalqam/.claude/qualia-engine/workflows/execute-plan.md
@/home/moayadalqam/.claude/qualia-engine/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/DESIGN.md
@src/actions/reports.ts
@src/lib/validations/reports.ts
@src/lib/auth/dal.ts
@src/components/ui/card.tsx
@src/components/ui/table.tsx
@src/components/ui/badge.tsx
@src/components/ui/select.tsx
@src/components/ui/input.tsx
@src/components/ui/button.tsx
@src/app/(dashboard)/dashboard/shifts/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Excel export utility and reusable report components</name>
  <files>
    src/lib/reports/export-xlsx.ts
    src/components/reports/report-filters.tsx
    src/components/reports/export-button.tsx
    src/components/reports/attendance-trend-chart.tsx
    src/components/reports/site-comparison-chart.tsx
  </files>
  <action>
Create the utility layer and shared components first.

**1. Excel export utility** at `/home/moayadalqam/projects/kunoz/src/lib/reports/export-xlsx.ts`:

```ts
import * as XLSX from "xlsx";

export function exportToXlsx(
  data: Record<string, unknown>[],
  sheetName: string,
  fileName: string
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Auto-size columns
  const colWidths = Object.keys(data[0] ?? {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
```

**2. Report filters component** at `/home/moayadalqam/projects/kunoz/src/components/reports/report-filters.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  locations: Location[];
  onApply: (filters: { from: string; to: string; locationId?: string }) => void;
  loading?: boolean;
  showLocationFilter?: boolean;
}

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export function ReportFilters({
  locations,
  onApply,
  loading,
  showLocationFilter = true,
}: ReportFiltersProps) {
  const defaults = getDefaultDateRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [locationId, setLocationId] = useState<string>("");

  const handleApply = () => {
    onApply({
      from,
      to,
      locationId: locationId || undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-40"
        />
      </div>
      {showLocationFilter && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button onClick={handleApply} disabled={loading} className="gap-2">
        <Search className="size-4" />
        {loading ? "Loading..." : "Apply"}
      </Button>
    </div>
  );
}
```

**3. Export button** at `/home/moayadalqam/projects/kunoz/src/components/reports/export-button.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToXlsx } from "@/lib/reports/export-xlsx";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  sheetName: string;
  fileName: string;
  disabled?: boolean;
}

export function ExportButton({ data, sheetName, fileName, disabled }: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;
    exportToXlsx(data, sheetName, fileName);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="gap-2"
    >
      <Download className="size-4" />
      Export Excel
    </Button>
  );
}
```

**4. Attendance Trend Chart** at `/home/moayadalqam/projects/kunoz/src/components/reports/attendance-trend-chart.tsx`:

```tsx
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrendDataPoint } from "@/lib/validations/reports";

// Kunoz design system colors
const COLORS = {
  present: "#059669",  // Emerald (Success)
  late: "#F59E0B",     // Amber (Warning)
  absent: "#DC2626",   // Red (Danger)
  onLeave: "#3B82F6",  // Blue
};

interface AttendanceTrendChartProps {
  data: TrendDataPoint[];
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    // Short date format: "Mar 28"
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attendance Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="present"
                name="Present"
                stackId="1"
                stroke={COLORS.present}
                fill={COLORS.present}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="late"
                name="Late"
                stackId="1"
                stroke={COLORS.late}
                fill={COLORS.late}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="absent"
                name="Absent"
                stackId="1"
                stroke={COLORS.absent}
                fill={COLORS.absent}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="onLeave"
                name="On Leave"
                stackId="1"
                stroke={COLORS.onLeave}
                fill={COLORS.onLeave}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

**5. Site Comparison Chart** at `/home/moayadalqam/projects/kunoz/src/components/reports/site-comparison-chart.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SiteComparisonRow } from "@/lib/validations/reports";

const COLORS = {
  attendance: "#0D7377", // Primary Teal
  late: "#F59E0B",       // Amber
  absence: "#DC2626",    // Red
};

interface SiteComparisonChartProps {
  data: SiteComparisonRow[];
}

export function SiteComparisonChart({ data }: SiteComparisonChartProps) {
  const formatted = data.map((d) => ({
    name: d.locationName,
    "Attendance %": d.attendanceRate,
    "Late %": d.lateRate,
    "Absence %": d.absenceRate,
    avgHours: d.averageHoursPerDay,
    overtimeHours: d.totalOvertimeHours,
    employees: d.totalEmployees,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Site Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formatted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Legend />
              <Bar dataKey="Attendance %" fill={COLORS.attendance} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Late %" fill={COLORS.late} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Absence %" fill={COLORS.absence} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

All chart components use the Kunoz design system colors (Deep Teal, Amber, Red, Blue). Charts use `hsl(var(--border))` for grid lines and `hsl(var(--card))` for tooltip backgrounds to respect dark mode.
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -10
```
Expected output: no TypeScript errors.

```bash
ls -la /home/moayadalqam/projects/kunoz/src/components/reports/ /home/moayadalqam/projects/kunoz/src/lib/reports/
```
Expected output: lists all 5 files (report-filters.tsx, export-button.tsx, attendance-trend-chart.tsx, site-comparison-chart.tsx, export-xlsx.ts).
  </verify>
  <done>Excel export utility, filter bar, export button, trend chart, and site comparison chart all compile and use Kunoz design system colors</done>
</task>

<task type="auto">
  <name>Task 2: Create report data tables and the reports page</name>
  <files>
    src/components/reports/daily-attendance-table.tsx
    src/components/reports/employee-summary-table.tsx
    src/components/reports/late-arrivals-table.tsx
    src/components/reports/reports-page.tsx
    src/app/(dashboard)/dashboard/reports/page.tsx
  </files>
  <action>
Create the data table components and wire them all together in the reports page.

**1. Daily Attendance Table** at `/home/moayadalqam/projects/kunoz/src/components/reports/daily-attendance-table.tsx`:

```tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyAttendanceReport } from "@/lib/validations/reports";
import { ExportButton } from "./export-button";

const statusConfig: Record<string, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  late: { label: "Late", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  absent: { label: "Absent", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  on_leave: { label: "On Leave", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  early_departure: { label: "Early Departure", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

interface DailyAttendanceTableProps {
  report: DailyAttendanceReport | null;
}

export function DailyAttendanceTable({ report }: DailyAttendanceTableProps) {
  if (!report) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select a date range and click Apply to generate the report
          </p>
        </CardContent>
      </Card>
    );
  }

  const exportData = report.rows.map((r) => ({
    "Employee #": r.employeeNumber,
    "Employee": r.employeeName,
    "Location": r.locationName,
    "Status": statusConfig[r.status]?.label ?? r.status,
    "Clock In": formatTime(r.clockIn),
    "Clock Out": formatTime(r.clockOut),
    "Duration": formatDuration(r.totalMinutes),
    "Shift": r.shiftName ?? "—",
    "Overtime": r.isOvertime ? formatDuration(r.overtimeMinutes) : "—",
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">
            Daily Attendance — {report.date}
            {report.locationName && ` — ${report.locationName}`}
          </CardTitle>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>Total: <strong className="text-foreground">{report.summary.total}</strong></span>
            <span className="text-emerald-600">Present: {report.summary.present}</span>
            <span className="text-amber-600">Late: {report.summary.late}</span>
            <span className="text-red-600">Absent: {report.summary.absent}</span>
            <span className="text-blue-600">On Leave: {report.summary.onLeave}</span>
          </div>
        </div>
        <ExportButton
          data={exportData}
          sheetName="Daily Attendance"
          fileName={`daily-attendance-${report.date}`}
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Shift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row, i) => {
                const cfg = statusConfig[row.status];
                return (
                  <TableRow key={row.employeeId} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="font-mono text-xs">{row.employeeNumber}</TableCell>
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cfg?.className ?? ""}>
                        {cfg?.label ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatTime(row.clockIn)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatTime(row.clockOut)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatDuration(row.totalMinutes)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.shiftName ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {report.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No attendance records found for this date range
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

**2. Employee Summary Table** at `/home/moayadalqam/projects/kunoz/src/components/reports/employee-summary-table.tsx`:

```tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmployeeSummaryRow } from "@/lib/validations/reports";
import { ExportButton } from "./export-button";

interface EmployeeSummaryTableProps {
  data: EmployeeSummaryRow[] | null;
}

export function EmployeeSummaryTable({ data }: EmployeeSummaryTableProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select a date range and click Apply to generate the report
          </p>
        </CardContent>
      </Card>
    );
  }

  const exportData = data.map((r) => ({
    "Employee #": r.employeeNumber,
    "Employee": r.employeeName,
    "Location": r.locationName,
    "Work Days": r.totalDays,
    "Present": r.presentDays,
    "Late": r.lateDays,
    "Absent": r.absentDays,
    "On Leave": r.onLeaveDays,
    "Total Hours": r.totalHours,
    "Overtime Hours": r.overtimeHours,
    "Avg Hours/Day": r.averageHoursPerDay,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Employee Summary</CardTitle>
        <ExportButton
          data={exportData}
          sheetName="Employee Summary"
          fileName="employee-summary"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="text-right text-emerald-600">Present</TableHead>
                <TableHead className="text-right text-amber-600">Late</TableHead>
                <TableHead className="text-right text-red-600">Absent</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right text-purple-600">OT Hours</TableHead>
                <TableHead className="text-right">Avg/Day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={row.employeeId} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <TableCell className="font-mono text-xs">{row.employeeNumber}</TableCell>
                  <TableCell className="font-medium">{row.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                  <TableCell className="text-right font-mono">{row.totalDays}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">{row.presentDays}</TableCell>
                  <TableCell className="text-right font-mono text-amber-600">{row.lateDays}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{row.absentDays}</TableCell>
                  <TableCell className="text-right font-mono">{row.totalHours}</TableCell>
                  <TableCell className="text-right font-mono text-purple-600">{row.overtimeHours}</TableCell>
                  <TableCell className="text-right font-mono">{row.averageHoursPerDay}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

**3. Late Arrivals Table** at `/home/moayadalqam/projects/kunoz/src/components/reports/late-arrivals-table.tsx`:

```tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LateArrivalRow, LateFrequency } from "@/lib/validations/reports";
import { ExportButton } from "./export-button";

interface LateArrivalsTableProps {
  rows: LateArrivalRow[] | null;
  frequencies: LateFrequency[] | null;
}

export function LateArrivalsTable({ rows, frequencies }: LateArrivalsTableProps) {
  if (!rows || !frequencies) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select a date range and click Apply to generate the report
          </p>
        </CardContent>
      </Card>
    );
  }

  const exportData = rows.map((r) => ({
    "Employee #": r.employeeNumber,
    "Employee": r.employeeName,
    "Location": r.locationName,
    "Date": r.date,
    "Clock In": new Date(r.clockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    "Shift Start": r.shiftStart,
    "Minutes Late": r.minutesLate,
    "Shift": r.shiftName ?? "—",
  }));

  return (
    <div className="space-y-6">
      {/* Frequency cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Late Frequency by Employee</CardTitle>
        </CardHeader>
        <CardContent>
          {frequencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No late arrivals found</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {frequencies.slice(0, 12).map((f) => (
                <div
                  key={f.employeeId}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{f.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{f.locationName}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="secondary"
                      className={
                        f.latePercentage > 30
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : f.latePercentage > 15
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : ""
                      }
                    >
                      {f.lateCount}x late ({f.latePercentage}%)
                    </Badge>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      avg {f.averageMinutesLate}min late
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Late Arrival Records</CardTitle>
          <ExportButton data={exportData} sheetName="Late Arrivals" fileName="late-arrivals" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Shift Start</TableHead>
                  <TableHead className="text-right">Min Late</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={`${row.employeeId}-${row.date}`} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="font-mono text-xs">{row.employeeNumber}</TableCell>
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                    <TableCell className="font-mono text-sm">{row.date}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {new Date(row.clockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.shiftStart}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600 font-semibold">
                      {row.minutesLate}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No late arrivals found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**4. Reports Page (client component)** at `/home/moayadalqam/projects/kunoz/src/components/reports/reports-page.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Calendar,
  Users,
  Clock,
  Timer,
  UserX,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportFilters } from "./report-filters";
import { AttendanceTrendChart } from "./attendance-trend-chart";
import { DailyAttendanceTable } from "./daily-attendance-table";
import { EmployeeSummaryTable } from "./employee-summary-table";
import { LateArrivalsTable } from "./late-arrivals-table";
import { SiteComparisonChart } from "./site-comparison-chart";
import { ExportButton } from "./export-button";
import {
  getDailyAttendanceReport,
  getEmployeeSummaryReport,
  getLateArrivalsReport,
  getOvertimeReport,
  getAbsenceReport,
  getSiteComparisonReport,
  getAttendanceTrend,
} from "@/actions/reports";
import type {
  DailyAttendanceReport,
  EmployeeSummaryRow,
  LateArrivalRow,
  LateFrequency,
  OvertimeRow,
  OvertimeSummary,
  AbsenceRow,
  AbsencePattern,
  SiteComparisonRow,
  TrendDataPoint,
} from "@/lib/validations/reports";

interface Location {
  id: string;
  name: string;
}

const tabs = [
  { id: "trends", label: "Trends", icon: BarChart3 },
  { id: "daily", label: "Daily", icon: Calendar },
  { id: "summary", label: "Summary", icon: Users },
  { id: "late", label: "Late Arrivals", icon: Clock },
  { id: "overtime", label: "Overtime", icon: Timer },
  { id: "absence", label: "Absences", icon: UserX },
  { id: "sites", label: "Site Comparison", icon: Building2 },
] as const;

type TabId = (typeof tabs)[number]["id"];

interface ReportsPageProps {
  locations: Location[];
  initialTrend: TrendDataPoint[];
}

export function ReportsPage({ locations, initialTrend }: ReportsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("trends");
  const [isPending, startTransition] = useTransition();

  // Report data states
  const [trend, setTrend] = useState<TrendDataPoint[]>(initialTrend);
  const [dailyReport, setDailyReport] = useState<DailyAttendanceReport | null>(null);
  const [summary, setSummary] = useState<EmployeeSummaryRow[] | null>(null);
  const [lateRows, setLateRows] = useState<LateArrivalRow[] | null>(null);
  const [lateFreq, setLateFreq] = useState<LateFrequency[] | null>(null);
  const [otRows, setOtRows] = useState<OvertimeRow[] | null>(null);
  const [otSummaries, setOtSummaries] = useState<OvertimeSummary[] | null>(null);
  const [absenceRows, setAbsenceRows] = useState<AbsenceRow[] | null>(null);
  const [absencePatterns, setAbsencePatterns] = useState<AbsencePattern[] | null>(null);
  const [siteData, setSiteData] = useState<SiteComparisonRow[] | null>(null);

  const handleApplyFilters = (filters: { from: string; to: string; locationId?: string }) => {
    startTransition(async () => {
      try {
        switch (activeTab) {
          case "trends": {
            const data = await getAttendanceTrend(14);
            setTrend(data);
            break;
          }
          case "daily": {
            const data = await getDailyAttendanceReport(filters);
            setDailyReport(data);
            break;
          }
          case "summary": {
            const data = await getEmployeeSummaryReport(filters);
            setSummary(data);
            break;
          }
          case "late": {
            const data = await getLateArrivalsReport(filters);
            setLateRows(data.rows);
            setLateFreq(data.frequencies);
            break;
          }
          case "overtime": {
            const data = await getOvertimeReport(filters);
            setOtRows(data.rows);
            setOtSummaries(data.summaries);
            break;
          }
          case "absence": {
            const data = await getAbsenceReport(filters);
            setAbsenceRows(data.rows);
            setAbsencePatterns(data.patterns);
            break;
          }
          case "sites": {
            const data = await getSiteComparisonReport(filters);
            setSiteData(data);
            break;
          }
        }
      } catch (err) {
        console.error("Report error:", err);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "gap-1.5 text-xs",
                activeTab === tab.id && "shadow-sm"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Filters */}
      {activeTab !== "trends" && (
        <Card>
          <CardContent className="pt-4">
            <ReportFilters
              locations={locations}
              onApply={handleApplyFilters}
              loading={isPending}
              showLocationFilter={activeTab !== "sites"}
            />
          </CardContent>
        </Card>
      )}

      {/* Report content */}
      {activeTab === "trends" && <AttendanceTrendChart data={trend} />}
      {activeTab === "daily" && <DailyAttendanceTable report={dailyReport} />}
      {activeTab === "summary" && <EmployeeSummaryTable data={summary} />}
      {activeTab === "late" && <LateArrivalsTable rows={lateRows} frequencies={lateFreq} />}
      {activeTab === "overtime" && (
        <OvertimeSection rows={otRows} summaries={otSummaries} />
      )}
      {activeTab === "absence" && (
        <AbsenceSection rows={absenceRows} patterns={absencePatterns} />
      )}
      {activeTab === "sites" && siteData && <SiteComparisonChart data={siteData} />}
      {activeTab === "sites" && !siteData && (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a date range and click Apply</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Overtime Section (inline since it's specific to this page) ──

function OvertimeSection({
  rows,
  summaries,
}: {
  rows: OvertimeRow[] | null;
  summaries: OvertimeSummary[] | null;
}) {
  if (!rows || !summaries) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a date range and click Apply</p>
        </CardContent>
      </Card>
    );
  }

  const exportData = rows.map((r) => ({
    "Employee #": r.employeeNumber,
    "Employee": r.employeeName,
    "Location": r.locationName,
    "Date": r.date,
    "Total Min": r.totalMinutes,
    "OT Min": r.overtimeMinutes,
    "Status": r.overtimeStatus,
    "Shift": r.shiftName ?? "—",
  }));

  const statusClass: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.slice(0, 9).map((s) => (
          <Card key={s.employeeId}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{s.locationName}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-purple-600">
                    {Math.round(s.totalOvertimeMinutes / 60 * 10) / 10}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.overtimeOccurrences} occurrences
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Overtime Records</CardTitle>
          <ExportButton data={exportData} sheetName="Overtime" fileName="overtime-report" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">OT Minutes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={`${row.employeeId}-${row.date}`} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="font-mono text-xs">{row.employeeNumber}</TableCell>
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="font-mono text-sm">{row.date}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-purple-600">
                      {row.overtimeMinutes}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusClass[row.overtimeStatus] ?? ""}>
                        {row.overtimeStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline Table imports for the sections
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardHeader, CardTitle } from "@/components/ui/card";

// ── Absence Section ──

function AbsenceSection({
  rows,
  patterns,
}: {
  rows: AbsenceRow[] | null;
  patterns: AbsencePattern[] | null;
}) {
  if (!rows || !patterns) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a date range and click Apply</p>
        </CardContent>
      </Card>
    );
  }

  const exportData = rows.map((r) => ({
    "Employee #": r.employeeNumber,
    "Employee": r.employeeName,
    "Location": r.locationName,
    "Date": r.date,
    "Reason": r.reason ?? "—",
    "Consecutive": r.isConsecutive ? `Yes (${r.consecutiveCount} days)` : "No",
  }));

  return (
    <div className="space-y-6">
      {/* Alert patterns */}
      {patterns.filter((p) => p.isAlert).length > 0 && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="text-base text-red-600">Absence Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {patterns
                .filter((p) => p.isAlert)
                .map((p) => (
                  <div
                    key={p.employeeId}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{p.locationName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-red-600">
                        {p.totalAbsences} days ({p.absenceRate}%)
                      </p>
                      {p.maxConsecutiveAbsences > 1 && (
                        <p className="text-xs text-red-500">
                          max {p.maxConsecutiveAbsences} consecutive
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Absence Records</CardTitle>
          <ExportButton data={exportData} sheetName="Absences" fileName="absence-report" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Consecutive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow
                    key={`${row.employeeId}-${row.date}`}
                    className={cn(
                      i % 2 === 0 ? "" : "bg-muted/30",
                      row.isConsecutive && "border-l-2 border-l-red-500"
                    )}
                  >
                    <TableCell className="font-mono text-xs">{row.employeeNumber}</TableCell>
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                    <TableCell className="font-mono text-sm">{row.date}</TableCell>
                    <TableCell className="text-sm">{row.reason ?? "—"}</TableCell>
                    <TableCell>
                      {row.isConsecutive ? (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          {row.consecutiveCount} days
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

NOTE: The imports for Table, CardHeader, CardTitle that appear after the `OvertimeSection` function need to be moved to the top of the file. The executor should place all imports at the top during implementation. The code above shows the logical structure; the executor consolidates all imports at file top.

**5. Reports page route** at `/home/moayadalqam/projects/kunoz/src/app/(dashboard)/dashboard/reports/page.tsx`:

```tsx
import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAttendanceTrend } from "@/actions/reports";
import { ReportsPage } from "@/components/reports/reports-page";

export const metadata = {
  title: "Reports -- Kunoz",
};

export default async function ReportsRoute() {
  await requireRole("admin", "hr_officer");

  const adminClient = createAdminClient();

  const [locResult, trend] = await Promise.all([
    adminClient.from("locations").select("id, name").eq("is_active", true).order("name"),
    getAttendanceTrend(14),
  ]);

  const locations = (locResult.data ?? []).map((l) => ({ id: l.id, name: l.name }));

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attendance analytics and workforce insights
        </p>
      </div>
      <ReportsPage locations={locations} initialTrend={trend} />
    </div>
  );
}
```
  </action>
  <verify>
```bash
cd /home/moayadalqam/projects/kunoz && npx tsc --noEmit 2>&1 | head -10
```
Expected output: no TypeScript errors.

```bash
ls /home/moayadalqam/projects/kunoz/src/components/reports/ | wc -l
```
Expected output: `8` or more files (report-filters, export-button, attendance-trend-chart, site-comparison-chart, daily-attendance-table, employee-summary-table, late-arrivals-table, reports-page).

```bash
test -f /home/moayadalqam/projects/kunoz/src/app/\(dashboard\)/dashboard/reports/page.tsx && echo "EXISTS" || echo "MISSING"
```
Expected output: `EXISTS`
  </verify>
  <done>Reports page renders at /dashboard/reports with 7 tabs, filter bar, data tables with color-coded status badges, recharts charts, and Excel export buttons on every table</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes
- Reports page accessible at /dashboard/reports for admin and hr_officer roles
- All 7 tabs render their respective components
- Charts use Kunoz design system colors
- Excel export generates valid .xlsx files
- Tables show striped rows and sticky headers per DESIGN.md
</verification>

<success_criteria>
- Trends tab shows stacked area chart with present/late/absent/on-leave data
- Daily tab shows per-employee attendance table with status badges
- Summary tab shows hours/overtime/absence metrics per employee
- Late tab shows frequency cards and detail records table
- Overtime tab shows summary cards and detail records with status badges
- Absence tab shows alert patterns (red cards) and detail records with consecutive markers
- Site Comparison tab shows grouped bar chart comparing all locations
- Every table has an Export Excel button that downloads .xlsx
- Filter bar persists from/to dates and location across tab switches
</success_criteria>

<output>
After completion, create `.planning/phases/6-reports-hr-actions/6-05-SUMMARY.md`
</output>

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExportButton } from "./export-button";
import { EmptyState } from "./report-helpers";
import dynamic from "next/dynamic";
import type { SiteComparisonRow } from "@/lib/validations/reports";

const SiteComparisonChart = dynamic(
  () => import("./site-comparison-chart").then((m) => m.SiteComparisonChart),
  { ssr: false }
);

export function SitesTab({ data }: { data: SiteComparisonRow[] | null }) {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance Rate by Site</CardTitle>
        </CardHeader>
        <CardContent>
          <SiteComparisonChart data={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Site Details ({data.length} locations)</CardTitle>
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
                    <span className={cn("font-mono font-semibold", row.attendanceRate >= 90 ? "text-emerald-600" : row.attendanceRate >= 75 ? "text-foreground" : row.attendanceRate >= 60 ? "text-amber-600" : "text-red-600")}>
                      {row.attendanceRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{row.avgHoursPerDay}h</TableCell>
                  <TableCell className="text-right font-mono text-purple-600">
                    {row.totalOvertimeHours > 0 ? `${row.totalOvertimeHours}h` : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.lateCount > 0 ? <span className="text-amber-600">{row.lateCount}</span> : <span className="text-muted-foreground">{"\u2014"}</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.absenceCount > 0 ? <span className="text-red-600">{row.absenceCount}</span> : <span className="text-muted-foreground">{"\u2014"}</span>}
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

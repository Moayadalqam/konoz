import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExportButton } from "./export-button";
import { EmptyState, minutesToDisplay } from "./report-helpers";
import type { OvertimeReport } from "@/lib/validations/reports";

const statusStyles: Record<string, string> = {
  approved: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  pending: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
  rejected: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
  mixed: "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/40",
};

export function OvertimeTab({ data }: { data: OvertimeReport | null }) {
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

  return (
    <div className="space-y-6">
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
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusStyles[row.overtimeStatus] ?? "")}>
                        {row.overtimeStatus}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No employee overtime data</p>
          )}
        </CardContent>
      </Card>

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
            <p className="py-8 text-center text-sm text-muted-foreground">No site overtime data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

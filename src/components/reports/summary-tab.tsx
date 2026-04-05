import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExportButton } from "./export-button";
import { EmptyState } from "./report-helpers";
import type { EmployeeSummaryRow } from "@/lib/validations/reports";

export function SummaryTab({ data }: { data: EmployeeSummaryRow[] | null }) {
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
          <CardTitle className="text-base">Employee Summary ({data.length} employees)</CardTitle>
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
                  {row.absences > 0 ? <span className="text-red-600">{row.absences}</span> : <span className="text-muted-foreground">{"\u2014"}</span>}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.lateCount > 0 ? <span className="text-amber-600">{row.lateCount}</span> : <span className="text-muted-foreground">{"\u2014"}</span>}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.earlyDepartureCount > 0 ? <span className="text-orange-600">{row.earlyDepartureCount}</span> : <span className="text-muted-foreground">{"\u2014"}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

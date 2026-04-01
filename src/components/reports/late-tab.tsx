import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "./export-button";
import { EmptyState, formatDateDisplay } from "./report-helpers";
import type { LateArrivalRow } from "@/lib/validations/reports";

export function LateTab({ data }: { data: LateArrivalRow[] | null }) {
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
          <CardTitle className="text-base">Late Arrivals ({data.length} employees)</CardTitle>
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
                  <Badge variant={row.lateCount >= 5 ? "destructive" : "secondary"} className="font-mono">
                    {row.lateCount}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.dates.slice(0, 5).map((d) => (
                      <span key={d} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { ExportButton } from "./export-button";
import { EmptyState, formatDateDisplay } from "./report-helpers";
import type { DailyAttendanceReport } from "@/lib/validations/reports";

export function DailyTab({ data }: { data: DailyAttendanceReport | null }) {
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

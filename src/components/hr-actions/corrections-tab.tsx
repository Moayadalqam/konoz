"use client";

import { useState, useEffect, useTransition } from "react";
import { Pencil, Search, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CorrectionDialog } from "@/components/hr-actions/correction-dialog";
import {
  getCorrectableRecordsAction,
  type CorrectableRecord,
} from "@/actions/hr-actions";

export function CorrectionsTab() {
  const [records, setRecords] = useState<CorrectableRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedRecord, setSelectedRecord] = useState<CorrectableRecord | null>(null);

  function fetchRecords(searchTerm?: string) {
    startTransition(async () => {
      try {
        const data = await getCorrectableRecordsAction({
          search: searchTerm || undefined,
        });
        setRecords(data);
      } catch {
        // silently handle — records will stay empty
      }
    });
  }

  useEffect(() => {
    fetchRecords();
  }, []);

  function handleSearch(value: string) {
    setSearch(value);
    fetchRecords(value);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or employee number..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isPending && records.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border">
          <Pencil className="size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No attendance records found for the selected period
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Employee</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Clock In</th>
                <th className="pb-3 pr-4 font-medium">Clock Out</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const clockIn = new Date(rec.clock_in);
                return (
                  <tr key={rec.id} className="border-b border-border/50">
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {rec.employee_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rec.employee_number} &middot; {rec.location_name}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {clockIn.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      {clockIn.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      {rec.clock_out
                        ? new Date(rec.clock_out).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1">
                        {rec.is_corrected && (
                          <CheckCircle2 className="size-3 text-primary" />
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            rec.status === "present"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : rec.status === "late"
                                ? "bg-amber-500/10 text-amber-600"
                                : rec.status === "absent" || rec.status === "on_leave"
                                  ? "bg-red-500/10 text-red-600"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rec.status.replace("_", " ")}
                        </span>
                      </span>
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecord(rec)}
                      >
                        <Pencil className="size-3.5" />
                        Correct
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedRecord && (
        <CorrectionDialog
          record={{
            id: selectedRecord.id,
            clock_in: selectedRecord.clock_in,
            clock_out: selectedRecord.clock_out,
            status: selectedRecord.status,
            employee_name: selectedRecord.employee_name,
          }}
          open={!!selectedRecord}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedRecord(null);
              fetchRecords(search || undefined);
            }
          }}
        />
      )}
    </div>
  );
}

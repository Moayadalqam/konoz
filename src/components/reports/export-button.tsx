"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: { key: string; header: string }[];
  filename: string;
}

export function ExportButton({ data, columns, filename }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!data.length) return;
    setExporting(true);

    try {
      const XLSX = await import("xlsx");

      // Build rows with column headers
      const rows = data.map((row) => {
        const mapped: Record<string, unknown> = {};
        for (const col of columns) {
          mapped[col.header] = row[col.key] ?? "";
        }
        return mapped;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Auto-size columns based on header length
      worksheet["!cols"] = columns.map((col) => ({
        wch: Math.max(col.header.length + 2, 14),
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      const dateStamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `${filename}-${dateStamp}.xlsx`);
    } catch {
      // xlsx import failed or export error - silently handle
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting || !data.length}
    >
      {exporting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Download className="size-3.5" />
      )}
      Export
    </Button>
  );
}

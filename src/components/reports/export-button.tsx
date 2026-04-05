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
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Report");

      // Add header row
      worksheet.columns = columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: Math.max(col.header.length + 4, 16),
      }));

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: "center" };

      // Add data rows
      for (const row of data) {
        const mapped: Record<string, unknown> = {};
        for (const col of columns) {
          mapped[col.key] = row[col.key] ?? "";
        }
        worksheet.addRow(mapped);
      }

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `${filename}-${dateStamp}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // exceljs import failed or export error
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

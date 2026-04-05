"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { AttendanceTrendPoint } from "@/lib/validations/reports";

interface AttendanceTrendChartProps {
  data: AttendanceTrendPoint[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label ? formatDate(label) : ""}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground capitalize">
              {entry.name}
            </span>
            <span className="ml-auto font-mono text-xs font-semibold text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const updateSize = useCallback(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    if (width > 0 && height > 0) {
      setSize((prev) =>
        prev.width === Math.floor(width) && prev.height === Math.floor(height)
          ? prev
          : { width: Math.floor(width), height: Math.floor(height) }
      );
    }
  }, [ref]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(ref.current);
    updateSize();
    return () => observer.disconnect();
  }, [ref, updateSize]);

  return size;
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerSize(containerRef);

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">
          No trend data available yet
        </p>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div ref={containerRef} className="h-[300px] w-full">
      {width > 0 && height > 0 && (
        <LineChart
          width={width}
          height={height}
          data={formatted}
          margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          <Line
            type="monotone"
            dataKey="present"
            name="Present"
            stroke="#059669"
            strokeWidth={2}
            dot={{ r: 3, fill: "#059669", strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
          <Line
            type="monotone"
            dataKey="absent"
            name="Absent"
            stroke="#DC2626"
            strokeWidth={2}
            dot={{ r: 3, fill: "#DC2626", strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
          <Line
            type="monotone"
            dataKey="late"
            name="Late"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ r: 3, fill: "#F59E0B", strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </LineChart>
      )}
    </div>
  );
}

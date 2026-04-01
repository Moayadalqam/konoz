"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import type { SiteComparisonRow } from "@/lib/validations/reports";

interface SiteComparisonChartProps {
  data: SiteComparisonRow[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: SiteComparisonRow;
    value: number;
  }>;
}) {
  if (!active || !payload?.length) return null;
  const site = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <p className="mb-1 text-xs font-semibold text-foreground">
        {site.locationName}
      </p>
      <p className="text-xs text-muted-foreground">{site.city}</p>
      <div className="mt-1.5 flex flex-col gap-0.5">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Attendance</span>
          <span className="font-mono font-semibold text-foreground">
            {site.attendanceRate}%
          </span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Employees</span>
          <span className="font-mono font-semibold text-foreground">
            {site.totalEmployees}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Avg hrs/day</span>
          <span className="font-mono font-semibold text-foreground">
            {site.avgHoursPerDay}h
          </span>
        </div>
      </div>
    </div>
  );
}

export function SiteComparisonChart({ data }: SiteComparisonChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">
          No site data available
        </p>
      </div>
    );
  }

  const chartHeight = Math.max(200, data.length * 48 + 40);

  return (
    <div style={{ height: chartHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="locationName"
            tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
          <Bar
            dataKey="attendanceRate"
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
          >
            {data.map((entry) => (
              <Cell
                key={entry.locationId}
                fill={
                  entry.attendanceRate >= 90
                    ? "#059669"
                    : entry.attendanceRate >= 75
                      ? "#0D7377"
                      : entry.attendanceRate >= 60
                        ? "#F59E0B"
                        : "#DC2626"
                }
              />
            ))}
            <LabelList
              dataKey="attendanceRate"
              position="right"
              formatter={(v: unknown) => `${v}%`}
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fill: "var(--color-foreground)",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

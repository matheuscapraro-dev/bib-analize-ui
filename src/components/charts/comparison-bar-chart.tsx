"use client";

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  AXIS_TICK,
  AXIS_CLASS,
  GRID_DASH,
  truncateLabel,
} from "@/lib/chart-config";
import type { ComparisonDataset } from "@/lib/comparison/types";

interface ComparisonBarChartProps {
  data: Record<string, unknown>[];
  categoryKey: string;
  datasets: ComparisonDataset[];
  height?: number;
  layout?: "horizontal" | "vertical";
  labelMaxLen?: number;
  showLegend?: boolean;
  stacked?: boolean;
}

export function ComparisonBarChart({
  data,
  categoryKey,
  datasets,
  height = 400,
  layout = "vertical",
  labelMaxLen = 35,
  showLegend = true,
  stacked = false,
}: ComparisonBarChartProps) {
  const isVertical = layout === "vertical";

  const yAxisWidth = isVertical
    ? Math.min(
        Math.max(
          ...data.map((d) => truncateLabel(String(d[categoryKey] ?? ""), labelMaxLen).length * 6.5),
          80,
        ),
        240,
      )
    : undefined;

  const margin = isVertical
    ? { top: 5, right: 20, bottom: 5, left: 10 }
    : { top: 5, right: 20, bottom: 5, left: 5 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout={layout} margin={margin}>
        <CartesianGrid strokeDasharray={GRID_DASH} className="stroke-border" />
        {isVertical ? (
          <>
            <XAxis type="number" tick={AXIS_TICK} className={AXIS_CLASS} />
            <YAxis
              dataKey={categoryKey}
              type="category"
              tick={{ fontSize: 11 }}
              width={yAxisWidth}
              className={AXIS_CLASS}
              tickFormatter={(v: string) => truncateLabel(v, labelMaxLen)}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={categoryKey}
              tick={{ fontSize: 11 }}
              className={AXIS_CLASS}
              tickFormatter={(v: string) => truncateLabel(String(v), 18)}
              interval="preserveStartEnd"
            />
            <YAxis tick={AXIS_TICK} className={AXIS_CLASS} />
          </>
        )}
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {datasets.map((ds) => (
          <Bar
            key={ds.id}
            dataKey={ds.id}
            name={ds.name}
            fill={ds.color}
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

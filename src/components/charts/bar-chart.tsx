"use client";

import { useMemo } from "react";
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
  CHART_PALETTE,
  paletteColor,
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  AXIS_TICK,
  AXIS_CLASS,
  GRID_DASH,
  MARGIN_DEFAULT,
  truncateLabel,
} from "@/lib/chart-config";

interface BarDef {
  key: string;
  label: string;
  color?: string;
  stackId?: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: BarDef[];
  height?: number;
  layout?: "horizontal" | "vertical";
  showGrid?: boolean;
  showLegend?: boolean;
  /** Max chars for Y-axis category labels in vertical (horizontal-bar) layout. */
  labelMaxLen?: number;
}

export function BarChart({
  data,
  xKey,
  bars,
  height = 350,
  layout = "horizontal",
  showGrid = true,
  showLegend = false,
  labelMaxLen = 35,
}: BarChartProps) {
  const isVertical = layout === "vertical";

  // Compute dynamic left margin based on the longest category label.
  const yAxisWidth = useMemo(() => {
    if (!isVertical) return undefined;
    let maxLen = 0;
    for (const d of data) {
      const v = String(d[xKey] ?? "");
      const truncated = truncateLabel(v, labelMaxLen);
      if (truncated.length > maxLen) maxLen = truncated.length;
    }
    return Math.min(Math.max(maxLen * 6.5, 80), 240);
  }, [data, xKey, isVertical, labelMaxLen]);

  const margin = useMemo(
    () => (isVertical ? { top: 5, right: 20, bottom: 5, left: 10 } : MARGIN_DEFAULT),
    [isVertical],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout={layout} margin={margin}>
        {showGrid && <CartesianGrid strokeDasharray={GRID_DASH} className="stroke-border" />}
        {isVertical ? (
          <>
            <XAxis type="number" tick={AXIS_TICK} className={AXIS_CLASS} />
            <YAxis
              dataKey={xKey}
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
              dataKey={xKey}
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
          labelFormatter={(_label, payload) => payload?.[0]?.payload?.[xKey] ?? _label}
          cursor={{ fill: "color-mix(in oklch, var(--muted) 30%, transparent)" }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.label}
            fill={b.color ?? paletteColor(i)}
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            stackId={b.stackId}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

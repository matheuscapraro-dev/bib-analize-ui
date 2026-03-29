"use client";

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  paletteColor,
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  AXIS_TICK,
  AXIS_CLASS,
  GRID_DASH,
  MARGIN_DEFAULT,
} from "@/lib/chart-config";

interface LineDef {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: LineDef[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function LineChart({
  data,
  xKey,
  lines,
  height = 350,
  showGrid = true,
  showLegend = false,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={MARGIN_DEFAULT}>
        {showGrid && <CartesianGrid strokeDasharray={GRID_DASH} className="stroke-border" />}
        <XAxis dataKey={xKey} tick={AXIS_TICK} className={AXIS_CLASS} />
        <YAxis tick={AXIS_TICK} className={AXIS_CLASS} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={l.color ?? paletteColor(i)}
            strokeWidth={2}
            dot={{ r: 3 }}
            strokeDasharray={l.dashed ? "5 5" : undefined}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

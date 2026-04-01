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
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  AXIS_TICK,
  AXIS_CLASS,
  GRID_DASH,
  MARGIN_DEFAULT,
} from "@/lib/chart-config";
import type { ComparisonDataset } from "@/lib/comparison/types";

interface OverlayLineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  datasets: ComparisonDataset[];
  height?: number;
  showLegend?: boolean;
  yLabel?: string;
}

export function OverlayLineChart({
  data,
  xKey,
  datasets,
  height = 350,
  showLegend = true,
  yLabel,
}: OverlayLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={MARGIN_DEFAULT}>
        <CartesianGrid strokeDasharray={GRID_DASH} className="stroke-border" />
        <XAxis dataKey={xKey} tick={AXIS_TICK} className={AXIS_CLASS} />
        <YAxis tick={AXIS_TICK} className={AXIS_CLASS} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", style: { fontSize: 11 } } : undefined} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {datasets.map((ds) => (
          <Line
            key={ds.id}
            type="monotone"
            dataKey={ds.id}
            name={ds.name}
            stroke={ds.color}
            strokeWidth={2}
            dot={{ r: 3, fill: ds.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

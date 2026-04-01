"use client";

import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";
import {
  TOOLTIP_STYLE,
} from "@/lib/chart-config";
import type { ComparisonDataset } from "@/lib/comparison/types";

interface RadarChartProps {
  data: Record<string, unknown>[];
  dimensionKey: string;
  labelKey?: string;
  datasets: ComparisonDataset[];
  height?: number;
  showLegend?: boolean;
}

export function RadarChart({
  data,
  dimensionKey,
  labelKey,
  datasets,
  height = 400,
  showLegend = true,
}: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart
        data={data}
        cx="50%"
        cy="50%"
        outerRadius="70%"
      >
        <PolarGrid className="stroke-border" />
        <PolarAngleAxis
          dataKey={labelKey ?? dimensionKey}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 10 }}
          className="fill-muted-foreground"
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {datasets.map((ds) => (
          <Radar
            key={ds.id}
            name={ds.name}
            dataKey={ds.id}
            stroke={ds.color}
            fill={ds.color}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}

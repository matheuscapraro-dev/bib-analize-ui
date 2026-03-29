"use client";

import {
  ResponsiveContainer,
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from "recharts";
import {
  paletteColor,
  TOOLTIP_STYLE,
  AXIS_TICK,
  AXIS_CLASS,
  GRID_DASH,
} from "@/lib/chart-config";

interface ScatterChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  zKey?: string;
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

export function ScatterChart({
  data,
  xKey,
  yKey,
  zKey,
  xLabel,
  yLabel,
  height = 350,
}: ScatterChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray={GRID_DASH} className="stroke-border" />
        <XAxis
          dataKey={xKey}
          type="number"
          name={xLabel ?? xKey}
          tick={AXIS_TICK}
          className={AXIS_CLASS}
          domain={["dataMin", "dataMax"]}
          label={xLabel ? { value: xLabel, position: "bottom", fontSize: 12 } : undefined}
        />
        <YAxis
          dataKey={yKey}
          type="number"
          name={yLabel ?? yKey}
          tick={AXIS_TICK}
          className={AXIS_CLASS}
          label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 } : undefined}
        />
        {zKey && <ZAxis dataKey={zKey} range={[20, 400]} />}
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ strokeDasharray: "3 3" }}
        />
        <Scatter data={data} fill={paletteColor(0)} />
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
}

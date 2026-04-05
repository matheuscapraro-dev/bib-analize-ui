"use client";

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  type PieLabelRenderProps,
} from "recharts";
import {
  CHART_PALETTE,
  paletteColor,
  TOOLTIP_STYLE,
  truncateLabel,
} from "@/lib/chart-config";

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  onSliceClick?: (entry: { name: string; value: number }) => void;
}

const RADIAN = Math.PI / 180;

function renderLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);
  const name = String(props.name ?? "");

  if (percent < 0.04) return null; // skip tiny slices
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="fill-foreground"
      fontSize={11}
      stroke="var(--background)"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {truncateLabel(name, 20)} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

export function PieChart({ data, height = 350, showLegend = true, innerRadius = 0, onSliceClick }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="70%"
          paddingAngle={1}
          label={renderLabel}
          labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          style={{ fontSize: 11 }}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={paletteColor(i)}
              onClick={onSliceClick ? () => onSliceClick(entry) : undefined}
              style={onSliceClick ? { cursor: "pointer" } : undefined}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [`${value}`, String(name)]}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

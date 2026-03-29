"use client";

import {
  ResponsiveContainer,
  Treemap as RechartsTreemap,
  Tooltip,
} from "recharts";
import { paletteColor, TOOLTIP_STYLE } from "@/lib/chart-config";

interface TreemapProps {
  data: { name: string; value: number; children?: { name: string; value: number }[] }[];
  height?: number;
}

interface CustomContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  index: number;
  depth: number;
}

function CustomizedContent({ x, y, width, height: h, name, index, depth }: CustomContentProps) {
  if (width < 30 || h < 20) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={h}
        style={{ fill: paletteColor(index), stroke: "#fff", strokeWidth: 2, opacity: depth === 1 ? 0.8 : 1 }}
      />
      {width > 50 && h > 25 && (
        <text
          x={x + width / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontSize={Math.min(12, width / 8)}
          fontWeight={500}
        >
          {name.length > width / 7 ? name.slice(0, Math.floor(width / 7)) + "…" : name}
        </text>
      )}
    </g>
  );
}

export function Treemap({ data, height = 350 }: TreemapProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsTreemap
        data={data}
        dataKey="value"
        aspectRatio={4 / 3}
        stroke="#fff"
        content={<CustomizedContent x={0} y={0} width={0} height={0} name="" index={0} depth={0} />}
      >
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </RechartsTreemap>
    </ResponsiveContainer>
  );
}

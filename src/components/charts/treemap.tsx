"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  ResponsiveContainer,
  Treemap as RechartsTreemap,
} from "recharts";
import { paletteColor, TOOLTIP_STYLE } from "@/lib/chart-config";

interface TreemapProps {
  data: { name: string; value: number; children?: { name: string; value: number }[] }[];
  height?: number;
  onCellClick?: (entry: { name: string; value: number }) => void;
}

interface CustomContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  index: number;
  depth: number;
  onCellClick?: (entry: { name: string; value: number }) => void;
  onHover?: (entry: { name: string; value: number; x: number; y: number } | null) => void;
}

function CustomizedContent({ x, y, width, height: h, name, value, index, depth, onCellClick, onHover }: CustomContentProps) {
  if (width < 30 || h < 20) return null;
  return (
    <g
      onClick={onCellClick ? () => onCellClick({ name, value }) : undefined}
      onMouseEnter={() => onHover?.({ name, value, x: x + width / 2, y })}
      onMouseLeave={() => onHover?.(null)}
      style={onCellClick ? { cursor: "pointer" } : undefined}
    >
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

export function Treemap({ data, height = 350, onCellClick }: TreemapProps) {
  const [hovered, setHovered] = useState<{ name: string; value: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!hovered || !containerRef.current || !tooltipRef.current) {
      setTooltipPos(null);
      return;
    }
    const container = containerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const margin = 8;

    let left = hovered.x - tip.width / 2;
    let top = hovered.y - tip.height - margin;

    // Clamp horizontal
    if (left < margin) left = margin;
    if (left + tip.width > container.width - margin) left = container.width - tip.width - margin;

    // If above the top, flip below
    if (top < margin) top = hovered.y + margin;

    setTooltipPos({ left, top });
  }, [hovered]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height, overflow: "hidden" }}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsTreemap
          data={data}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={
            <CustomizedContent
              x={0} y={0} width={0} height={0} name="" value={0} index={0} depth={0}
              onCellClick={onCellClick}
              onHover={setHovered}
            />
          }
        />
      </ResponsiveContainer>
      {hovered && (
        <div
          ref={tooltipRef}
          style={{
            ...TOOLTIP_STYLE,
            position: "absolute",
            left: tooltipPos ? tooltipPos.left : hovered.x,
            top: tooltipPos ? tooltipPos.top : hovered.y - 8,
            transform: tooltipPos ? undefined : "translate(-50%, -100%)",
            pointerEvents: "none",
            zIndex: 10,
            padding: "6px 10px",
            whiteSpace: "nowrap",
            visibility: tooltipPos ? "visible" : "hidden",
          }}
        >
          <span style={{ fontWeight: 600 }}>{hovered.name}</span>
          {" : "}
          <span>{hovered.value.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

"use client";

import type { BoxPlotData } from "@/lib/comparison/types";
import { formatNumber } from "@/lib/utils";

interface BoxPlotComparisonProps {
  data: BoxPlotData[];
  height?: number;
  valueLabel?: string;
}

/**
 * Renders horizontal box plots comparing distributions across datasets.
 * Pure SVG — no external deps needed.
 */
export function BoxPlotComparison({ data, height: propHeight, valueLabel }: BoxPlotComparisonProps) {
  if (!data.length) return null;

  const ROW_HEIGHT = 60;
  const PADDING = { top: 30, right: 40, bottom: 30, left: 140 };
  const height = propHeight ?? PADDING.top + PADDING.bottom + data.length * ROW_HEIGHT;
  const width = 600; // viewBox width, responsive via SVG

  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  // Scale: find global min/max
  const allVals = data.flatMap((d) => [d.min, d.max, ...d.outliers]);
  const globalMin = Math.min(0, ...allVals);
  const globalMax = Math.max(...allVals) * 1.05 || 1;

  const scaleX = (v: number) =>
    PADDING.left + ((v - globalMin) / (globalMax - globalMin)) * plotWidth;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: height }}
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const x = PADDING.left + pct * plotWidth;
        const val = globalMin + pct * (globalMax - globalMin);
        return (
          <g key={pct}>
            <line
              x1={x} y1={PADDING.top}
              x2={x} y2={PADDING.top + plotHeight}
              className="stroke-border"
              strokeDasharray="3 3"
            />
            <text
              x={x} y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {val < 10 ? val.toFixed(1) : Math.round(val)}
            </text>
          </g>
        );
      })}

      {/* Value label */}
      {valueLabel && (
        <text
          x={PADDING.left + plotWidth / 2}
          y={14}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={11}
          fontWeight={500}
        >
          {valueLabel}
        </text>
      )}

      {/* Box plots */}
      {data.map((d, i) => {
        const cy = PADDING.top + i * ROW_HEIGHT + ROW_HEIGHT / 2;
        const boxH = ROW_HEIGHT * 0.5;

        return (
          <g key={d.datasetId}>
            {/* Dataset label */}
            <text
              x={PADDING.left - 8}
              y={cy + 4}
              textAnchor="end"
              fontSize={11}
              fontWeight={500}
              className="fill-foreground"
            >
              {d.datasetName.length > 20 ? d.datasetName.slice(0, 19) + "…" : d.datasetName}
            </text>

            {/* Color indicator */}
            <circle cx={PADDING.left - PADDING.left + 12} cy={cy} r={5} fill={d.color} />

            {/* Whisker: min to q1 */}
            <line
              x1={scaleX(d.min)} y1={cy}
              x2={scaleX(d.q1)} y2={cy}
              stroke={d.color} strokeWidth={1.5}
            />
            {/* Whisker cap: min */}
            <line
              x1={scaleX(d.min)} y1={cy - boxH / 4}
              x2={scaleX(d.min)} y2={cy + boxH / 4}
              stroke={d.color} strokeWidth={1.5}
            />

            {/* Box: q1 to q3 */}
            <rect
              x={scaleX(d.q1)}
              y={cy - boxH / 2}
              width={scaleX(d.q3) - scaleX(d.q1)}
              height={boxH}
              fill={d.color}
              fillOpacity={0.2}
              stroke={d.color}
              strokeWidth={1.5}
              rx={3}
            />

            {/* Median line */}
            <line
              x1={scaleX(d.median)} y1={cy - boxH / 2}
              x2={scaleX(d.median)} y2={cy + boxH / 2}
              stroke={d.color} strokeWidth={2.5}
            />

            {/* Mean diamond */}
            <circle
              cx={scaleX(d.mean)} cy={cy}
              r={3} fill={d.color}
            />

            {/* Whisker: q3 to max */}
            <line
              x1={scaleX(d.q3)} y1={cy}
              x2={scaleX(d.max)} y2={cy}
              stroke={d.color} strokeWidth={1.5}
            />
            {/* Whisker cap: max */}
            <line
              x1={scaleX(d.max)} y1={cy - boxH / 4}
              x2={scaleX(d.max)} y2={cy + boxH / 4}
              stroke={d.color} strokeWidth={1.5}
            />

            {/* Outliers */}
            {d.outliers.slice(0, 20).map((v, j) => (
              <circle
                key={j}
                cx={scaleX(v)} cy={cy}
                r={2} fill={d.color} fillOpacity={0.5}
              />
            ))}

            {/* Stats tooltip-like labels */}
            <title>
              {d.datasetName}: min={d.min}, Q1={d.q1}, med={d.median}, Q3={d.q3}, max={d.max}, média={d.mean}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

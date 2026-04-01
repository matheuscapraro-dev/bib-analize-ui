import type { BibWork, KpiData } from "@/types/bibliometric";

/* ── Dataset ─────────────────────────────────────────────── */

export interface ComparisonDataset {
  id: string;
  name: string;
  source: "openalex" | "upload";
  works: BibWork[];
  color: string;
  colorHex: string;
  worksCount: number;
}

/* ── Palette ─────────────────────────────────────────────── */

export const DATASET_COLORS = [
  { hsl: "hsl(221 83% 53%)", hex: "#3b82f6", label: "Azul" },
  { hsl: "hsl(350 72% 55%)", hex: "#d94467", label: "Vermelho" },
  { hsl: "hsl(160 60% 45%)", hex: "#2bb57a", label: "Verde" },
  { hsl: "hsl(35 92% 55%)", hex: "#e5932a", label: "Laranja" },
] as const;

export const MAX_DATASETS = 4;

/* ── Overlap / Set operation results ─────────────────────── */

export interface OverlapResult {
  /** Items that appear in all given sets */
  shared: string[];
  /** Items exclusive to each dataset (index-aligned) */
  exclusive: string[][];
  /** Jaccard similarity index (0–1) */
  jaccard: number;
  /** Total unique items across all sets */
  union: number;
  /** Items per set */
  counts: number[];
}

/* ── KPI Comparison ──────────────────────────────────────── */

export interface KpiComparison {
  datasetId: string;
  datasetName: string;
  color: string;
  kpis: KpiData;
}

/* ── Radar / Profile ─────────────────────────────────────── */

export interface RadarDimension {
  dimension: string;
  fullLabel: string;
  [datasetId: string]: number | string;
}

/* ── Temporal overlay ────────────────────────────────────── */

export interface TemporalOverlayPoint {
  year: number;
  [datasetId: string]: number;
}

/* ── Butterfly / Side-by-side ────────────────────────────── */

export interface ButterflyItem {
  name: string;
  [datasetId: string]: string | number;
}

/* ── Box plot ────────────────────────────────────────────── */

export interface BoxPlotData {
  datasetId: string;
  datasetName: string;
  color: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  outliers: number[];
}

/* ── Distribution ────────────────────────────────────────── */

export interface DistributionItem {
  category: string;
  [datasetId: string]: string | number;
}

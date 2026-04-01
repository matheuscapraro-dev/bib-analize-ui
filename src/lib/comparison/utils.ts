import type { BibWork } from "@/types/bibliometric";
import type { OverlapResult, BoxPlotData, ComparisonDataset } from "./types";
import { safeSplit } from "@/lib/parser";

/* ── Set operations ──────────────────────────────────────── */

/**
 * Compute overlap between 2-4 sets of string items.
 * Returns shared items, exclusive per dataset, jaccard index, and counts.
 */
export function computeOverlap(sets: string[][]): OverlapResult {
  if (!sets.length) {
    return { shared: [], exclusive: [], jaccard: 0, union: 0, counts: [] };
  }

  const setObjects = sets.map((s) => new Set(s));
  const union = new Set(sets.flat());
  const unionSize = union.size;

  // Shared = intersection of ALL sets
  const shared = [...setObjects[0]].filter((item) =>
    setObjects.every((s) => s.has(item)),
  );

  // Exclusive = in this set but NOT in any other
  const exclusive = setObjects.map((current, i) =>
    [...current].filter((item) =>
      setObjects.every((other, j) => j === i || !other.has(item)),
    ),
  );

  // Jaccard = |intersection| / |union|
  const jaccard = unionSize > 0 ? shared.length / unionSize : 0;

  return {
    shared,
    exclusive,
    jaccard,
    union: unionSize,
    counts: sets.map((s) => new Set(s).size),
  };
}

/* ── Normalization (0–1 scale) ───────────────────────────── */

export function normalize(values: number[]): number[] {
  const max = Math.max(...values);
  if (max === 0) return values.map(() => 0);
  return values.map((v) => Math.round((v / max) * 1000) / 1000);
}

/* ── Percentage delta ────────────────────────────────────── */

export function pctDelta(a: number, b: number): number {
  if (b === 0) return a === 0 ? 0 : 100;
  return Math.round(((a - b) / b) * 1000) / 10;
}

/* ── Box plot statistics ─────────────────────────────────── */

export function computeBoxPlot(
  values: number[],
  dataset: ComparisonDataset,
): BoxPlotData {
  if (!values.length) {
    return {
      datasetId: dataset.id,
      datasetName: dataset.name,
      color: dataset.color,
      min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0, outliers: [],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const min = sorted.find((v) => v >= lowerFence) ?? sorted[0];
  const max = [...sorted].reverse().find((v) => v <= upperFence) ?? sorted[n - 1];
  const mean = Math.round((sorted.reduce((s, v) => s + v, 0) / n) * 100) / 100;
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

  return {
    datasetId: dataset.id,
    datasetName: dataset.name,
    color: dataset.color,
    min, q1, median, q3, max, mean, outliers,
  };
}

/* ── Extract field values from BibWork[] ─────────────────── */

function valStr(work: BibWork, key: string): string {
  const v = work[key];
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

/** Extract unique items from a semicolon-separated field. */
export function extractFieldItems(works: BibWork[], field: string, lowercase = false): string[] {
  const items: string[] = [];
  for (const w of works) {
    const raw = valStr(w, field);
    if (!raw) continue;
    for (const part of safeSplit(raw)) {
      const normalized = lowercase ? part.toLowerCase() : part;
      items.push(normalized);
    }
  }
  return items;
}

/** Count occurrences of each unique value from a field. */
export function countField(works: BibWork[], field: string, lowercase = false): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of works) {
    const raw = valStr(w, field);
    if (!raw) continue;
    for (const part of safeSplit(raw)) {
      const key = lowercase ? part.toLowerCase() : part;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

/** Get the top N entries from a count map. */
export function topNFromMap(map: Map<string, number>, n: number): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Unique set of items from a field. */
export function uniqueFieldItems(works: BibWork[], field: string, lowercase = false): Set<string> {
  return new Set(extractFieldItems(works, field, lowercase));
}

/**
 * Shared chart configuration.
 *
 * Central place for colors, tooltip styles, axis defaults, and margins so
 * every chart component renders consistently and we never repeat these objects.
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

/** HSL strings that Recharts can resolve directly (no CSS var() indirection). */
export const CHART_PALETTE = [
  "hsl(221 83% 53%)",   // vibrant blue
  "hsl(160 60% 45%)",   // teal
  "hsl(35 92% 55%)",    // amber
  "hsl(280 65% 55%)",   // purple
  "hsl(350 72% 55%)",   // rose
  "hsl(190 70% 50%)",   // cyan
  "hsl(45 90% 52%)",    // yellow
  "hsl(140 55% 42%)",   // green
  "hsl(310 55% 50%)",   // magenta
  "hsl(200 70% 55%)",   // sky
] as const;

/** Identical palette as resolved hex values for use in <canvas> contexts. */
export const CHART_PALETTE_HEX = [
  "#3b82f6", // blue
  "#2bb57a", // teal
  "#e5932a", // amber
  "#9253d5", // purple
  "#d94467", // rose
  "#1fa9c9", // cyan
  "#e5b517", // yellow
  "#3a9e5c", // green
  "#c43eb3", // magenta
  "#3b9de0", // sky
] as const;

export function paletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

export function paletteHex(index: number): string {
  return CHART_PALETTE_HEX[index % CHART_PALETTE_HEX.length];
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

export const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  maxWidth: 320,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

export const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: 2,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

// ---------------------------------------------------------------------------
// Axis
// ---------------------------------------------------------------------------

export const AXIS_TICK = { fontSize: 11 } as const;
export const AXIS_CLASS = "fill-muted-foreground";

// ---------------------------------------------------------------------------
// Margins
// ---------------------------------------------------------------------------

export const MARGIN_DEFAULT = { top: 5, right: 20, bottom: 5, left: 5 } as const;

/** For vertical (horizontal-bar) charts with long category labels on the Y axis. */
export function verticalMargin(maxLabelLength: number) {
  const labelWidth = Math.min(Math.max(maxLabelLength * 6, 80), 220);
  return { top: 5, right: 20, bottom: 5, left: labelWidth } as const;
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export const GRID_DASH = "3 3";

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

/** Truncate text to a max length, adding "…" if needed. */
export function truncateLabel(text: string, maxLen = 30): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
}

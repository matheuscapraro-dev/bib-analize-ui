/**
 * Centralized brand configuration — single source of truth.
 * Change values here and they propagate across the entire app.
 */
export const BRAND = {
  /** Display name shown in headers, sidebars, and metadata */
  name: "Huginn & Muninn",
  /** Short tagline shown below the name */
  tagline: "Análise Bibliométrica",
  /** Full description for SEO / metadata */
  description:
    "Plataforma de análise bibliométrica com dados Web of Science e OpenAlex. Desenvolvido por Matheus A. Capraro sob orientação da Prof.ª Dr.ª Ana Cristina K. Vendramin — PPGCA/UTFPR.",
  /** Current version badge */
  version: "v2.0",
  /** Authors for metadata */
  authors: [
    { name: "Matheus A. Capraro" },
    { name: "Ana Cristina K. Vendramin" },
  ],
} as const;

/**
 * Scopus journal-level enrichment.
 * Extracts unique ISSNs from a set of BibWork records and fetches
 * CiteScore/percentile/Qualis classification for each journal via the Scopus API.
 *
 * Returns a Map<issn, JournalMetrics> separate from BibWork records.
 */

import type { BibWork, JournalMetrics } from "@/types/bibliometric";
import { fetchJournalPercentiles } from "./scopus-api";

export interface EnrichmentResult {
  journalMetrics: Map<string, JournalMetrics>;
  enrichedCount: number;
  notFoundCount: number;
  totalIssns: number;
}

/**
 * Extract all unique ISSNs from a set of works, fetch journal metrics from Scopus,
 * and return the resulting map.
 */
export async function enrichJournalMetrics(
  works: BibWork[],
  onProgress?: (done: number, total: number) => void,
): Promise<EnrichmentResult> {
  // Collect unique ISSNs (both print and electronic)
  const issnSet = new Set<string>();
  for (const w of works) {
    if (w.SN) issnSet.add(w.SN.trim());
    if (w.EI) issnSet.add(w.EI.trim());
  }

  const issns = [...issnSet].filter(Boolean);
  const totalIssns = issns.length;

  if (totalIssns === 0) {
    return {
      journalMetrics: new Map(),
      enrichedCount: 0,
      notFoundCount: 0,
      totalIssns: 0,
    };
  }

  const journalMetrics = await fetchJournalPercentiles(issns, onProgress);

  return {
    journalMetrics,
    enrichedCount: journalMetrics.size,
    notFoundCount: totalIssns - journalMetrics.size,
    totalIssns,
  };
}

/**
 * Get the JournalMetrics for a specific work by looking up its ISSN or eISSN.
 */
export function getWorkJournalMetrics(
  work: BibWork,
  journalMetrics: Map<string, JournalMetrics>,
): JournalMetrics | null {
  if (work.SN && journalMetrics.has(work.SN)) return journalMetrics.get(work.SN)!;
  if (work.EI && journalMetrics.has(work.EI)) return journalMetrics.get(work.EI)!;
  return null;
}

/**
 * Scopus Serial Title API client.
 * Fetches journal-level metrics (CiteScore, percentile, SJR, SNIP) via the
 * proxy at /api/scopus to avoid CORS and protect the API key.
 */

import type { JournalMetrics } from "@/types/bibliometric";
import { percentileToQualis } from "@/lib/constants";

const PROXY = "/api/scopus";
const CONCURRENCY = 3;
const DELAY_MS = 350;

/* ── In-memory cache ─────────────────────────────────────── */
const cache = new Map<string, JournalMetrics>();

/* ── Response parsing ────────────────────────────────────── */

/**
 * Parse the Scopus Serial Title API JSON response into our JournalMetrics type.
 * The response structure (CITESCORE view) contains nested citeScoreYearInfoList.
 */
function parseResponse(data: Record<string, unknown>, issn: string): JournalMetrics | null {
  try {
    const results = data["serial-metadata-response"] as Record<string, unknown> | undefined;
    if (!results) return null;

    const entry = (results.entry as Record<string, unknown>[])
      ?.[0] as Record<string, unknown> | undefined;
    if (!entry) return null;

    const title = String(entry["dc:title"] ?? "");

    // CiteScore data
    const csYearInfo = entry["citeScoreYearInfoList"] as Record<string, unknown> | undefined;
    const citeScore = csYearInfo
      ? parseFloat(String(csYearInfo["citeScoreCurrentMetric"] ?? "")) || null
      : null;

    // SJR and SNIP
    const sjrList = entry["SJRList"] as Record<string, unknown> | undefined;
    const sjrEntry = sjrList?.["SJR"] as Record<string, unknown>[] | undefined;
    const sjr = sjrEntry?.[0]
      ? parseFloat(String(sjrEntry[0]["$"] ?? "")) || null
      : null;

    const snipList = entry["SNIPList"] as Record<string, unknown> | undefined;
    const snipEntry = snipList?.["SNIP"] as Record<string, unknown>[] | undefined;
    const snip = snipEntry?.[0]
      ? parseFloat(String(snipEntry[0]["$"] ?? "")) || null
      : null;

    // Subject area and percentile
    // Percentile lives inside citeScoreYearInfo (status=Complete) →
    //   citeScoreInformationList[0] → citeScoreInfo[0] → citeScoreSubjectRank[]
    // Each rank entry has { subjectCode, rank, percentile }.
    // We pick the highest percentile across all subject areas.
    let highestPercentile: number | null = null;
    let subjectArea = "";

    // Build a subject-code → name map from the top-level subject-area list
    const subjectAreas = entry["subject-area"] as Record<string, unknown>[] | undefined;
    const subjectNameMap = new Map<string, string>();
    if (subjectAreas?.length) {
      for (const sa of subjectAreas) {
        const code = String(sa["@code"] ?? "");
        const name = String(sa["$"] ?? sa["@abbrev"] ?? "");
        if (code && name) subjectNameMap.set(code, name);
      }
    }

    if (csYearInfo) {
      const yearInfos = csYearInfo["citeScoreYearInfo"] as Record<string, unknown>[] | undefined;
      if (yearInfos?.length) {
        // Prefer the latest "Complete" year; fall back to the last entry
        const completeYear = yearInfos.filter((y) => y["@status"] === "Complete").pop() ?? yearInfos[yearInfos.length - 1];
        const infoList = (completeYear["citeScoreInformationList"] as Record<string, unknown>[] | undefined) ?? [];
        const csInfo = ((infoList[0]?.["citeScoreInfo"]) as Record<string, unknown>[] | undefined) ?? [];
        for (const info of csInfo) {
          const ranks = (info["citeScoreSubjectRank"] as Record<string, unknown>[] | undefined) ?? [];
          for (const r of ranks) {
            const pct = parseFloat(String(r["percentile"] ?? ""));
            if (!isNaN(pct) && (highestPercentile === null || pct > highestPercentile)) {
              highestPercentile = pct;
              const code = String(r["subjectCode"] ?? "");
              subjectArea = subjectNameMap.get(code) ?? code;
            }
          }
        }
      }
    }

    return {
      issn,
      title,
      citeScore,
      percentile: highestPercentile,
      subjectArea,
      sjr,
      snip,
      qualisClass: highestPercentile !== null ? percentileToQualis(highestPercentile) : null,
    };
  } catch {
    return null;
  }
}

/* ── Single ISSN fetch ───────────────────────────────────── */

export async function fetchJournalMetrics(issn: string): Promise<JournalMetrics | null> {
  const key = issn.trim();
  if (!key) return null;

  if (cache.has(key)) return cache.get(key)!;

  const resp = await fetch(`${PROXY}?issn=${encodeURIComponent(key)}`);
  if (!resp.ok) return null;

  const data = await resp.json();
  const metrics = parseResponse(data, key);
  if (metrics) cache.set(key, metrics);
  return metrics;
}

/* ── Batch fetch ─────────────────────────────────────────── */

export async function fetchJournalPercentiles(
  issns: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, JournalMetrics>> {
  const unique = [...new Set(issns.filter(Boolean).map((i) => i.trim()))];
  const result = new Map<string, JournalMetrics>();
  let done = 0;

  // Resolve from cache first
  const toFetch: string[] = [];
  for (const issn of unique) {
    if (cache.has(issn)) {
      result.set(issn, cache.get(issn)!);
      done++;
    } else {
      toFetch.push(issn);
    }
  }

  onProgress?.(done, unique.length);

  // Fetch remaining in batches
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (issn) => {
      const metrics = await fetchJournalMetrics(issn);
      if (metrics) {
        result.set(issn, metrics);
      }
      done++;
      onProgress?.(done, unique.length);
    });

    await Promise.allSettled(promises);

    // Rate limit between batches
    if (i + CONCURRENCY < toFetch.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return result;
}

/** Clear the in-memory metrics cache */
export function clearMetricsCache() {
  cache.clear();
}

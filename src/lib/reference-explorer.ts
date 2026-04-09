/**
 * Reference Explorer — fetch and expand reference chains via OpenAlex.
 *
 * Uses the same proxy route (/api/openalex) to keep API keys server-side.
 * Batch-fetches works by OpenAlex ID, supporting up to 2 levels of expansion.
 */
import type { BibWork } from "@/types/bibliometric";

const OPENALEX_BASE =
  typeof window !== "undefined" ? "/api/openalex" : "https://api.openalex.org";
const BATCH_SIZE = 50;
const CONCURRENCY = 3;
const DELAY_MS = 110;
const CONTACT_EMAIL = "bibliometrics@analysis.app";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── Map raw OpenAlex work to a lightweight BibWork ─────── */
function mapWork(w: Record<string, unknown>): Partial<BibWork> {
  const row: Record<string, unknown> = {};

  row.UT = String(w.id ?? "").replace("https://openalex.org/", "");
  row.DI = String(w.doi ?? "").replace("https://doi.org/", "");
  row.TI = w.title ?? w.display_name ?? "";
  row.PY = Number(w.publication_year ?? 0);
  row.TC = Number(w.cited_by_count ?? 0);

  const wtype = String(w.type ?? "");
  const TYPE_MAP: Record<string, string> = {
    article: "Article", review: "Review", "book-chapter": "Book Chapter",
    book: "Book", "proceedings-article": "Proceedings Paper",
    dataset: "Data Paper", "posted-content": "Preprint",
  };
  row.DT = TYPE_MAP[wtype] ?? wtype.replace(/-/g, " ");

  const pv = (w.primary_location ?? {}) as Record<string, unknown>;
  const source = (pv.source ?? {}) as Record<string, unknown>;
  row.SO = source.display_name ?? "";

  // Authors
  const authorships = (w.authorships ?? []) as Record<string, unknown>[];
  row.AU = authorships
    .map((a) => String(((a.author ?? {}) as Record<string, unknown>).display_name ?? ""))
    .filter(Boolean)
    .join("; ");

  // Abstract
  const aii = w.abstract_inverted_index as Record<string, number[]> | null;
  if (aii) {
    const words: [number, string][] = [];
    for (const [word, positions] of Object.entries(aii)) {
      for (const pos of positions) words.push([pos, word]);
    }
    words.sort((a, b) => a[0] - b[0]);
    row.AB = words.map(([, wd]) => wd).join(" ");
  } else {
    row.AB = "";
  }

  // Referenced works → _REF_IDS
  const refs = (w.referenced_works ?? []) as string[];
  row._REF_IDS = refs.map((r) => String(r).replace("https://openalex.org/", ""));
  row.NR = refs.length || Number(w.referenced_works_count ?? 0);

  // FWCI
  row._FWCI = (w.fwci as number) ?? null;
  const cnp = (w.citation_normalized_percentile ?? {}) as Record<string, unknown>;
  row._CITE_PERCENTILE = (cnp.value as number) ?? null;

  // OA
  const oa = (w.open_access ?? {}) as Record<string, unknown>;
  row.OA = String(oa.oa_status ?? "");

  return row as Partial<BibWork>;
}

/* ── Batch-fetch works by OpenAlex ID ────────────────────── */
async function fetchBatch(ids: string[]): Promise<Record<string, unknown>[]> {
  if (!ids.length) return [];

  const filter = ids
    .map((id) => (id.startsWith("https://") ? id : `https://openalex.org/${id}`))
    .join("|");

  const params = new URLSearchParams();
  params.set("filter", `openalex_id:${filter}`);
  params.set("per_page", String(Math.min(ids.length, 100)));
  params.set("sort", "cited_by_count:desc");
  params.set("mailto", CONTACT_EMAIL);

  const resp = await fetch(`${OPENALEX_BASE}/works?${params}`);
  if (!resp.ok) return [];

  const data = await resp.json();
  return (data.results ?? []) as Record<string, unknown>[];
}

/**
 * Fetch full BibWork records for a list of OpenAlex IDs, in parallel batches.
 */
export async function fetchWorksByIds(ids: string[]): Promise<Partial<BibWork>[]> {
  if (!ids.length) return [];

  // Split into batches
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    batches.push(ids.slice(i, i + BATCH_SIZE));
  }

  const results: Record<string, unknown>[] = [];

  // Process in waves of CONCURRENCY
  for (let w = 0; w < batches.length; w += CONCURRENCY) {
    const wave = batches.slice(w, w + CONCURRENCY);
    const waveResults = await Promise.all(wave.map((batch) => fetchBatch(batch)));
    for (const r of waveResults) results.push(...r);
    if (w + CONCURRENCY < batches.length) await sleep(DELAY_MS);
  }

  return results.map(mapWork);
}

/* ── Search for seed works (lightweight wrapper) ─────────── */
export async function searchSeedWorks(query: string): Promise<Partial<BibWork>[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams();

  // Detect DOI-like input
  const isDoi = /^10\.\d{4,}/.test(query.trim()) || query.trim().startsWith("https://doi.org/");
  if (isDoi) {
    const cleanDoi = query.trim().startsWith("https://") ? query.trim() : `https://doi.org/${query.trim()}`;
    params.set("filter", `doi:${cleanDoi}`);
  } else {
    params.set("search", query);
  }

  params.set("per_page", "10");
  params.set("sort", "cited_by_count:desc");
  params.set("mailto", CONTACT_EMAIL);

  const resp = await fetch(`${OPENALEX_BASE}/works?${params}`);
  if (!resp.ok) return [];

  const data = await resp.json();
  const works = (data.results ?? []) as Record<string, unknown>[];
  return works.map(mapWork);
}

/**
 * Expand references for a given work, fetching up to topN referenced works
 * sorted by citation count.
 */
export async function expandReferences(
  refIds: string[],
  topN: number,
): Promise<Partial<BibWork>[]> {
  if (!refIds.length) return [];

  // Fetch all, then sort by citations and take topN
  const allWorks = await fetchWorksByIds(refIds);
  return allWorks
    .sort((a, b) => (b.TC ?? 0) - (a.TC ?? 0))
    .slice(0, topN);
}

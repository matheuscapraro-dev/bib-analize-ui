import type { BibWork } from "@/types/bibliometric";
import { LANG_MAP, OA_STATUS_MAP } from "./constants";
import { hasBooleanOperators, booleanPostFilter } from "./boolean-filter";

const OPENALEX_BASE = "https://api.openalex.org";
const PER_PAGE = 100;
const CONTACT_EMAIL = "bibliometrics@analysis.app";

/* ── Rate-limit & concurrency constants ──────────────────── */
const DELAY_WITH_KEY = 105;      // ms — API key allows ~10 req/s
const DELAY_WITHOUT_KEY = 150;   // ms — polite pool ~7 req/s
const PARALLEL_CONCURRENCY = 3;  // max concurrent page fetches
/** OpenAlex page-based pagination hard limit (page * per_page ≤ 10 000) */
const MAX_PAGE_OFFSET = 10_000;

/* ── Lightweight request cache (TTL-based) ───────────────── */
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const requestCache = new Map<string, { data: unknown; ts: number }>();

function cacheGet<T>(key: string): T | undefined {
  const entry = requestCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) { requestCache.delete(key); return undefined; }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown): void {
  requestCache.set(key, { data, ts: Date.now() });
}

/** Evict expired entries (called lazily). */
function cacheEvict(): void {
  const now = Date.now();
  for (const [k, v] of requestCache) {
    if (now - v.ts > CACHE_TTL) requestCache.delete(k);
  }
}

/** Clear the entire request cache. */
export function clearRequestCache(): void {
  requestCache.clear();
}

function invertAbstract(inverted: Record<string, number[]> | null): string {
  if (!inverted) return "";
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, w]) => w).join(" ");
}

function workToRow(work: Record<string, unknown>): Partial<BibWork> {
  const row: Record<string, unknown> = {};

  row.UT = String(work.id ?? "").replace("https://openalex.org/", "");
  row.DI = String(work.doi ?? "").replace("https://doi.org/", "");
  row.TI = work.title ?? work.display_name ?? "";

  const wtype = String(work.type ?? "");
  const TYPE_MAP: Record<string, string> = {
    article: "Article", review: "Review", "book-chapter": "Book Chapter",
    book: "Book", "proceedings-article": "Proceedings Paper",
    dataset: "Data Paper", "posted-content": "Preprint",
    dissertation: "Dissertation", editorial: "Editorial Material",
    letter: "Letter", erratum: "Correction",
  };
  row.DT = TYPE_MAP[wtype] ?? wtype.replace(/-/g, " ");
  row.PT = ["article", "review", "letter", "editorial"].includes(wtype) ? "J" : "S";

  const pv = (work.primary_location ?? {}) as Record<string, unknown>;
  const source = (pv.source ?? {}) as Record<string, unknown>;
  row.SO = source.display_name ?? "";
  row.SN = source.issn_l ?? "";
  const issns = source.issn as string[] | undefined;
  row.EI = Array.isArray(issns) && issns.length > 1 ? issns[issns.length - 1] : "";

  row.PY = work.publication_year ?? null;
  const bib = (work.biblio ?? {}) as Record<string, unknown>;
  row.VL = bib.volume ?? "";
  row.IS = bib.issue ?? "";
  row.BP = bib.first_page ?? "";
  row.EP = bib.last_page ?? "";

  // Authors
  const authorships = (work.authorships ?? []) as Record<string, unknown>[];
  const auList: string[] = [];
  const afList: string[] = [];
  const c1Parts: string[] = [];
  const c3Set = new Set<string>();
  const countriesSet = new Set<string>();
  const instTypesSet = new Set<string>();

  for (const a of authorships) {
    const author = (a.author ?? {}) as Record<string, unknown>;
    const display = String(author.display_name ?? "");
    if (!display) continue;
    afList.push(display);
    const parts = display.split(" ");
    if (parts.length >= 2) {
      const surname = parts[parts.length - 1];
      const initials = parts.slice(0, -1).map((p) => p[0]).join("");
      auList.push(`${surname}, ${initials}`);
    } else {
      auList.push(display);
    }

    const rawAffs = (a.raw_affiliation_strings ?? []) as string[];
    for (const aff of rawAffs) if (aff) c1Parts.push(`[${display}] ${aff}`);

    for (const inst of (a.institutions ?? []) as Record<string, unknown>[]) {
      const instName = String(inst.display_name ?? "");
      if (instName) c3Set.add(instName);
      const cc = String(inst.country_code ?? "");
      if (cc) countriesSet.add(cc);
      const itype = String(inst.type ?? "");
      if (itype) instTypesSet.add(itype);
    }
    for (const cc of (a.countries ?? []) as string[]) if (cc) countriesSet.add(cc);
  }

  row.AU = auList.join("; ");
  row.AF = afList.join("; ");
  row.C1 = c1Parts.join("; ");
  row.C3 = [...c3Set].sort().join("; ");
  row._INST_TYPES = [...instTypesSet].sort().join("; ");
  row._CONTINENTS = "";
  row._N_COUNTRIES = work.countries_distinct_count ?? null;
  row._N_INSTITUTIONS = work.institutions_distinct_count ?? null;

  // Citations
  row.TC = Number(work.cited_by_count ?? 0);
  row.Z9 = row.TC;
  row._FWCI = (work.fwci as number) ?? null;

  const cnp = (work.citation_normalized_percentile ?? {}) as Record<string, unknown>;
  row._CITE_PERCENTILE = cnp.value ?? null;
  row._TOP_1PCT = cnp.is_in_top_1_percent ?? false;
  row._TOP_10PCT = cnp.is_in_top_10_percent ?? false;

  // Abstract
  row.AB = invertAbstract(work.abstract_inverted_index as Record<string, number[]> | null);

  // Language
  const lang = String(work.language ?? "");
  row.LA = LANG_MAP[lang] ?? lang.toUpperCase();

  // Keywords
  const authorKw = ((work.keywords ?? []) as Record<string, unknown>[])
    .map((k) => String(k.display_name ?? "")).filter(Boolean);
  row.DE = authorKw.join("; ");

  const concepts = (work.concepts ?? []) as Record<string, unknown>[];
  const idKw = concepts
    .filter((c) => (Number(c.score) || 0) >= 0.3)
    .map((c) => String(c.display_name ?? "")).filter(Boolean);
  row.ID = idKw.length ? idKw.join("; ") : row.DE;

  // References
  row.CR = "";
  row.NR = ((work.referenced_works ?? []) as unknown[]).length || Number(work.referenced_works_count ?? 0);

  // Funding
  const funders = (work.funders ?? []) as Record<string, unknown>[];
  const fuParts: string[] = [];
  const seenFunders = new Set<string>();
  for (const f of funders) {
    const fname = String(f.display_name ?? "");
    if (fname && !seenFunders.has(fname)) {
      seenFunders.add(fname);
      fuParts.push(fname);
    }
  }
  row.FU = fuParts.join("; ");

  // Open Access
  const oa = (work.open_access ?? {}) as Record<string, unknown>;
  const oaStatus = String(oa.oa_status ?? "");
  row.OA = OA_STATUS_MAP[oaStatus] ?? oaStatus;

  // Topics / Categories
  const topics = (work.topics ?? []) as Record<string, unknown>[];
  const subfields = new Set<string>();
  const fields = new Set<string>();
  for (const t of topics) {
    const sf = (t.subfield ?? {}) as Record<string, unknown>;
    if (sf.display_name) subfields.add(String(sf.display_name));
    const fd = (t.field ?? {}) as Record<string, unknown>;
    if (fd.display_name) fields.add(String(fd.display_name));
  }
  row.WC = [...subfields].sort().join("; ");
  row.SC = [...fields].sort().join("; ");

  // SDG
  const sdgs = (work.sustainable_development_goals ?? []) as Record<string, unknown>[];
  if (sdgs.length) row._SDG = sdgs.map((s) => String(s.display_name ?? "")).filter(Boolean).join("; ");

  // Indexed In
  const indexedIn = (work.indexed_in ?? []) as string[];
  if (indexedIn.length) row._INDEXED = indexedIn.join("; ");

  // Citation trajectory
  const cby = work.counts_by_year as unknown[];
  if (cby && cby.length) row._CITE_TRAJECTORY = JSON.stringify(cby);
  else row._CITE_TRAJECTORY = "";

  row._RETRACTED = work.is_retracted ?? false;
  row._GLOBAL_SOUTH = null;

  return row as Partial<BibWork>;
}

export interface OpenAlexTopic {
  id: string;
  display_name: string;
  description: string;
  works_count: number;
  subfield: { id: string; display_name: string };
  field: { id: string; display_name: string };
  domain: { id: string; display_name: string };
}

export type SearchScope = "title_and_abstract" | "title" | "fulltext";

export interface OpenAlexSearchParams {
  topic?: string;
  topicIds?: string[];
  topicFilterMode?: "search" | "topics";
  searchScope?: SearchScope;
  author?: string;
  source?: string;
  institution?: string;
  doi?: string;
  yearStart?: number;
  yearEnd?: number;
  docType?: string | null;
  language?: string;
  oaOnly?: boolean;
  hasAbstract?: boolean;
  strictBoolean?: boolean;
  rawAffiliation?: string;
  authorIds?: string;
  institutionId?: string;
  indexedIn?: string;
  sort?: string;
  maxRecords?: number;
  email?: string;
  apiKey?: string;
}

function buildFilters(params: OpenAlexSearchParams): { search: string | null; filter: string | null } {
  const filters: string[] = [];
  let search: string | null = null;

  const mode = params.topicFilterMode ?? "search";

  if (mode === "topics" && params.topicIds?.length) {
    // Topic taxonomy mode: filter by classified topic IDs
    const ids = params.topicIds.map((id) => id.replace("https://openalex.org/", "")).join("|");
    filters.push(`topics.id:${ids}`);
    if (params.topic) {
      search = params.topic;
    }
  } else if (params.topic) {
    // Texto livre → search param (fulltext com relevância) — idêntico ao Python
    search = params.topic;
  }

  if (params.author) filters.push(`authorships.author.display_name.search:${params.author}`);
  if (params.source) filters.push(`primary_location.source.display_name.search:${params.source}`);
  if (params.institution) filters.push(`authorships.institutions.display_name.search:${params.institution}`);
  if (params.doi) {
    const cleanDoi = params.doi.startsWith("https://") ? params.doi : `https://doi.org/${params.doi}`;
    filters.push(`doi:${cleanDoi}`);
  }
  if (params.yearStart && params.yearEnd) {
    filters.push(params.yearStart === params.yearEnd
      ? `publication_year:${params.yearStart}`
      : `publication_year:${params.yearStart}-${params.yearEnd}`);
  } else if (params.yearStart) {
    filters.push(`publication_year:${params.yearStart}-`);
  } else if (params.yearEnd) {
    filters.push(`publication_year:-${params.yearEnd}`);
  }
  if (params.docType) filters.push(`type:${params.docType}`);
  if (params.language) filters.push(`language:${params.language}`);
  if (params.rawAffiliation) {
    filters.push(`raw_affiliation_strings.search:${params.rawAffiliation}`);
  }
  if (params.authorIds) {
    const ids = params.authorIds.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean).join("|");
    if (ids) filters.push(`authorships.author.id:${ids}`);
  }
  if (params.institutionId) {
    const id = params.institutionId.trim().replace("https://openalex.org/", "");
    if (id) filters.push(`institutions.id:${id}`);
  }
  if (params.indexedIn) filters.push(`indexed_in:${params.indexedIn}`);
  if (params.oaOnly) filters.push("open_access.is_oa:true");
  if (params.hasAbstract) filters.push("has_abstract:true");

  // System filter — only add when there are user-specified filters or search
  if (search || filters.length > 0) {
    filters.push("is_retracted:false");
  }

  return { search, filter: filters.length ? filters.join(",") : null };
}

export async function getOpenAlexCount(params: OpenAlexSearchParams): Promise<number> {
  const { search, filter } = buildFilters(params);
  if (!search && !filter) throw new Error("Nenhum filtro ou busca definido.");

  // Check cache
  const cacheKey = `count:${search ?? ""}|${filter ?? ""}`;
  const cached = cacheGet<number>(cacheKey);
  if (cached !== undefined) return cached;

  const urlParams = new URLSearchParams();
  urlParams.set("per_page", "1");
  if (params.apiKey) {
    urlParams.set("api_key", params.apiKey);
  } else {
    urlParams.set("mailto", params.email || CONTACT_EMAIL);
  }
  if (search) urlParams.set("search", search);
  if (filter) urlParams.set("filter", filter);

  const resp = await fetch(`${OPENALEX_BASE}/works?${urlParams}`);
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`OpenAlex error ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  const count = data.meta?.count ?? 0;
  cacheSet(cacheKey, count);
  return count;
}

export async function fetchOpenAlexWorks(
  params: OpenAlexSearchParams,
  onProgress?: (fetched: number, total: number) => void,
): Promise<Partial<BibWork>[]> {
  const { search, filter } = buildFilters(params);
  if (!search && !filter) throw new Error("Nenhum filtro ou busca definido.");
  const maxRecords = params.maxRecords ?? 1000;
  const delay = params.apiKey ? DELAY_WITH_KEY : DELAY_WITHOUT_KEY;

  // relevance_score requires a search query — fall back to cited_by_count when no search
  let sort = params.sort ?? "relevance_score:desc";
  if (!search && sort.startsWith("relevance_score")) {
    sort = "cited_by_count:desc";
  }
  const useBoolean = params.strictBoolean !== false && !!params.topic && hasBooleanOperators(params.topic);

  // ── Build base URL params (shared by all page fetches) ──
  const baseParams = new URLSearchParams();
  baseParams.set("per_page", String(PER_PAGE));
  if (params.apiKey) {
    baseParams.set("api_key", params.apiKey);
  } else {
    baseParams.set("mailto", params.email || CONTACT_EMAIL);
  }
  if (search) baseParams.set("search", search);
  if (filter) baseParams.set("filter", filter);
  if (sort) baseParams.set("sort", sort);

  // ── First request (cursor=*) to get count + first page ──
  const firstParams = new URLSearchParams(baseParams);
  firstParams.set("cursor", "*");
  const resp = await fetch(`${OPENALEX_BASE}/works?${firstParams}`);
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`OpenAlex error ${resp.status}: ${body.slice(0, 200)}`);
  }
  let firstData = await resp.json();
  const totalAvailable = firstData.meta?.count ?? 0;
  if (totalAvailable === 0) return [];

  // For boolean queries: use adaptive fetching (stop when we have enough passing records)
  // For normal queries: fetch exactly what we need
  const targetFetch = useBoolean
    ? Math.min(totalAvailable, maxRecords * 5) // cap at 5× but we'll stop early
    : Math.min(totalAvailable, maxRecords);

  const allRows: Partial<BibWork>[] = [];
  for (const w of firstData.results ?? []) allRows.push(workToRow(w));
  onProgress?.(Math.min(allRows.length, maxRecords), useBoolean ? maxRecords : targetFetch);

  // Check if first page already satisfies - skip parallel fetch
  if (allRows.length >= targetFetch) {
    if (useBoolean) {
      return booleanPostFilter(allRows, params.topic!).slice(0, maxRecords);
    }
    return allRows.slice(0, maxRecords);
  }

  const totalPages = Math.ceil(targetFetch / PER_PAGE);
  const canUseParallel = targetFetch <= MAX_PAGE_OFFSET;

  if (canUseParallel && totalPages > 1) {
    // ── Parallel page-based fetching ──
    // Pages 2..N fetched in concurrent waves of PARALLEL_CONCURRENCY
    const pagesToFetch: number[] = [];
    for (let p = 2; p <= totalPages; p++) pagesToFetch.push(p);

    // Helper: fetch a single page by page number
    const fetchPage = async (pageNum: number): Promise<Partial<BibWork>[]> => {
      const p = new URLSearchParams(baseParams);
      p.set("page", String(pageNum));
      const r = await fetch(`${OPENALEX_BASE}/works?${p}`);
      if (!r.ok) return [];
      const d = await r.json();
      return ((d.results ?? []) as Record<string, unknown>[]).map(workToRow);
    };

    // Track boolean-filtered count for adaptive early termination
    let booleanPassedCount = useBoolean
      ? booleanPostFilter(allRows, params.topic!).length
      : 0;

    for (let i = 0; i < pagesToFetch.length; i += PARALLEL_CONCURRENCY) {
      // Early termination for boolean: stop when we have enough passing records
      if (useBoolean && booleanPassedCount >= maxRecords) break;

      const wave = pagesToFetch.slice(i, i + PARALLEL_CONCURRENCY);
      if (i > 0) await new Promise((r) => setTimeout(r, delay));
      const waveResults = await Promise.all(wave.map(fetchPage));

      for (const pageRows of waveResults) {
        for (const row of pageRows) {
          if (allRows.length >= targetFetch) break;
          allRows.push(row);
        }
        // Track boolean yield per wave for adaptive stop
        if (useBoolean) {
          booleanPassedCount += booleanPostFilter(pageRows, params.topic!).length;
        }
      }
      onProgress?.(
        useBoolean ? Math.min(booleanPassedCount, maxRecords) : Math.min(allRows.length, maxRecords),
        useBoolean ? maxRecords : targetFetch,
      );
    }
  } else if (totalPages > 1) {
    // ── Fallback: sequential cursor pagination (for > 10K results) ──
    let data = firstData;
    while (allRows.length < targetFetch) {
      const nextCursor = data.meta?.next_cursor;
      if (!nextCursor) break;

      const cursorParams = new URLSearchParams(baseParams);
      cursorParams.set("cursor", nextCursor);
      await new Promise((r) => setTimeout(r, delay));
      const resp2 = await fetch(`${OPENALEX_BASE}/works?${cursorParams}`);
      if (!resp2.ok) break;
      data = await resp2.json();
      const results = data.results ?? [];
      if (!results.length) break;

      for (const w of results) {
        if (allRows.length >= targetFetch) break;
        allRows.push(workToRow(w));
      }
      onProgress?.(Math.min(allRows.length, maxRecords), useBoolean ? maxRecords : targetFetch);
    }
  }

  // Lazy cache eviction
  if (requestCache.size > 50) cacheEvict();

  if (useBoolean) {
    const filtered = booleanPostFilter(allRows, params.topic!);
    return filtered.slice(0, maxRecords);
  }

  return allRows.slice(0, maxRecords);
}

/** Search the OpenAlex /topics endpoint and return matching topics. */
export async function searchTopics(
  query: string,
  params?: Pick<OpenAlexSearchParams, "email" | "apiKey">,
): Promise<OpenAlexTopic[]> {
  if (!query.trim()) return [];

  // Check cache
  const cacheKey = `topics:${query.trim().toLowerCase()}`;
  const cached = cacheGet<OpenAlexTopic[]>(cacheKey);
  if (cached) return cached;

  const urlParams = new URLSearchParams();
  urlParams.set("search", query);
  urlParams.set("per_page", "10");
  if (params?.apiKey) {
    urlParams.set("api_key", params.apiKey);
  } else {
    urlParams.set("mailto", params?.email || CONTACT_EMAIL);
  }

  const resp = await fetch(`${OPENALEX_BASE}/topics?${urlParams}`);
  if (!resp.ok) return [];
  const data = await resp.json();

  const results = ((data.results ?? []) as Record<string, unknown>[]).map((t) => ({
    id: String(t.id ?? ""),
    display_name: String(t.display_name ?? ""),
    description: String(t.description ?? ""),
    works_count: Number(t.works_count ?? 0),
    subfield: (t.subfield ?? { id: "", display_name: "" }) as OpenAlexTopic["subfield"],
    field: (t.field ?? { id: "", display_name: "" }) as OpenAlexTopic["field"],
    domain: (t.domain ?? { id: "", display_name: "" }) as OpenAlexTopic["domain"],
  }));
  cacheSet(cacheKey, results);
  return results;
}

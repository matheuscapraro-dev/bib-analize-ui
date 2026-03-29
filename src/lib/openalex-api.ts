import type { BibWork } from "@/types/bibliometric";
import { LANG_MAP, OA_STATUS_MAP } from "./constants";

const OPENALEX_BASE = "https://api.openalex.org";
const PER_PAGE = 100;
const CONTACT_EMAIL = "bibliometrics@analysis.app";

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

export interface OpenAlexSearchParams {
  topic?: string;
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
  sort?: string;
  maxRecords?: number;
  apiKey?: string;
}

function buildFilters(params: OpenAlexSearchParams): { search: string | null; filter: string | null } {
  const filters: string[] = [];
  let search: string | null = null;

  if (params.topic) search = params.topic;
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
  if (params.oaOnly) filters.push("open_access.is_oa:true");
  if (params.hasAbstract) filters.push("has_abstract:true");
  filters.push("is_retracted:false");

  return { search, filter: filters.length ? filters.join(",") : null };
}

export async function getOpenAlexCount(params: OpenAlexSearchParams): Promise<number> {
  const { search, filter } = buildFilters(params);
  const urlParams = new URLSearchParams();
  urlParams.set("per_page", "1");
  urlParams.set("mailto", CONTACT_EMAIL);
  if (params.apiKey) urlParams.set("api_key", params.apiKey);
  if (search) urlParams.set("search", search);
  if (filter) urlParams.set("filter", filter);

  const resp = await fetch(`${OPENALEX_BASE}/works?${urlParams}`);
  if (!resp.ok) throw new Error(`OpenAlex error: ${resp.status}`);
  const data = await resp.json();
  return data.meta?.count ?? 0;
}

export async function fetchOpenAlexWorks(
  params: OpenAlexSearchParams,
  onProgress?: (fetched: number, total: number) => void,
): Promise<Partial<BibWork>[]> {
  const { search, filter } = buildFilters(params);
  const maxRecords = params.maxRecords ?? 1000;
  const sort = params.sort ?? "relevance_score:desc";

  const urlParams = new URLSearchParams();
  urlParams.set("per_page", String(PER_PAGE));
  urlParams.set("cursor", "*");
  urlParams.set("mailto", CONTACT_EMAIL);
  if (params.apiKey) urlParams.set("api_key", params.apiKey);
  if (search) urlParams.set("search", search);
  if (filter) urlParams.set("filter", filter);
  if (sort) urlParams.set("sort", sort);

  const resp = await fetch(`${OPENALEX_BASE}/works?${urlParams}`);
  if (!resp.ok) throw new Error(`OpenAlex error: ${resp.status}`);
  let data = await resp.json();
  const totalAvailable = data.meta?.count ?? 0;
  if (totalAvailable === 0) return [];

  const toFetch = Math.min(totalAvailable, maxRecords);
  const allRows: Partial<BibWork>[] = [];

  for (const w of data.results ?? []) allRows.push(workToRow(w));
  onProgress?.(allRows.length, toFetch);

  while (allRows.length < toFetch) {
    const nextCursor = data.meta?.next_cursor;
    if (!nextCursor) break;

    urlParams.set("cursor", nextCursor);
    await new Promise((r) => setTimeout(r, 120));
    const resp2 = await fetch(`${OPENALEX_BASE}/works?${urlParams}`);
    if (!resp2.ok) break;
    data = await resp2.json();
    const results = data.results ?? [];
    if (!results.length) break;

    for (const w of results) {
      if (allRows.length >= toFetch) break;
      allRows.push(workToRow(w));
    }
    onProgress?.(allRows.length, toFetch);
  }

  return allRows;
}

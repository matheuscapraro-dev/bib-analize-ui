/**
 * Web of Science Starter API client.
 * Port of bib-analize/app/utils/wos_api.py to TypeScript.
 * Uses /api/wos proxy route to bypass CORS restrictions.
 */
import type { BibWork } from "@/types/bibliometric";

const WOS_PROXY = "/api/wos";
const PAGE_SIZE = 50;

export const WOS_DATABASES: Record<string, string> = {
  WOS: "Web of Science Core Collection",
  BIOABS: "Biological Abstracts",
  BCI: "BIOSIS Citation Index",
  BIOSIS: "BIOSIS Previews",
  CCC: "Current Contents Connect",
  DIIDW: "Derwent Innovations Index",
  DRCI: "Data Citation Index",
  MEDLINE: "MEDLINE",
  ZOOREC: "Zoological Records",
  PPRN: "Preprint Citation Index",
  WOK: "Todas as bases",
};

export const WOS_SORT_OPTIONS = [
  { value: "RS+D", label: "Relevância ↓" },
  { value: "RS+A", label: "Relevância ↑" },
  { value: "PY+D", label: "Ano ↓" },
  { value: "PY+A", label: "Ano ↑" },
  { value: "TC+D", label: "Citações ↓" },
  { value: "TC+A", label: "Citações ↑" },
  { value: "LD+D", label: "Data de carga ↓" },
  { value: "LD+A", label: "Data de carga ↑" },
];

export interface WosSearchParams {
  topic?: string;
  author?: string;
  source?: string;
  organization?: string;
  doi?: string;
  yearStart?: number;
  yearEnd?: number;
  database?: string;
  sortField?: string;
  maxRecords?: number;
  apiKey: string;
  rawQuery?: string;
}

// ---------------------------------------------------------------------------
// Document → BibWork conversion (port of _document_to_row)
// ---------------------------------------------------------------------------

function documentToRow(doc: Record<string, unknown>): Partial<BibWork> {
  const row: Record<string, unknown> = {};

  row.UT = String(doc.uid ?? "");
  row.TI = String(doc.title ?? "");

  const types = (doc.types ?? []) as string[];
  row.DT = types[0] ?? "";

  const sourceTypes = (doc.sourceTypes ?? []) as string[];
  if (sourceTypes.length) {
    const first = sourceTypes[0];
    row.PT = first ? first[0].toUpperCase() : "";
  } else {
    row.PT = "";
  }

  const source = (doc.source ?? {}) as Record<string, unknown>;
  row.SO = String(source.sourceTitle ?? "");
  row.PY = source.publishYear ?? null;
  row.PD = String(source.publishMonth ?? "");
  row.VL = String(source.volume ?? "");
  row.IS = String(source.issue ?? "");
  row.AR = String(source.articleNumber ?? "");

  const pages = (source.pages ?? {}) as Record<string, unknown>;
  row.BP = String(pages.begin ?? "");
  row.EP = String(pages.end ?? "");
  row.PG = pages.count ?? null;

  // Authors
  const names = (doc.names ?? {}) as Record<string, unknown>;
  const authors = (names.authors ?? []) as Record<string, unknown>[];
  const auList: string[] = [];
  const afList: string[] = [];
  const riList: string[] = [];
  for (const a of authors) {
    const wosStd = String(a.wosStandard ?? "");
    const display = String(a.displayName ?? "");
    auList.push(wosStd || display);
    afList.push(display || wosStd);
    const rid = String(a.researcherId ?? "");
    if (rid) riList.push(`${display}/${rid}`);
  }
  row.AU = auList.join("; ");
  row.AF = afList.join("; ");
  row.RI = riList.length ? riList.join("; ") : "";

  // Identifiers
  const ids = (doc.identifiers ?? {}) as Record<string, unknown>;
  row.DI = String(ids.doi ?? "");
  row.SN = String(ids.issn ?? "");
  row.EI = String(ids.eissn ?? "");
  row.BN = String(ids.isbn ?? "");
  row.PM = String(ids.pmid ?? "");

  // Citations
  const citations = (doc.citations ?? []) as Record<string, unknown>[];
  let wosCit = 0;
  let totalCit = 0;
  for (const c of citations) {
    const count = Number(c.count ?? 0) || 0;
    totalCit += count;
    if (c.db === "WOS") wosCit = count;
  }
  row.TC = wosCit;
  row.Z9 = totalCit;

  // Keywords
  const keywords = (doc.keywords ?? {}) as Record<string, unknown>;
  const authorKw = (keywords.authorKeywords ?? []) as string[];
  row.DE = authorKw.length ? authorKw.join("; ") : "";

  // Fields that WoS Starter API does NOT provide (filled by enrichment later)
  row.AB = "";
  row.C1 = "";
  row.C3 = "";
  row.CR = "";
  row.NR = 0;
  row.FU = "";
  row.OA = "";
  row.WC = "";
  row.SC = "";
  row.LA = "";
  row.ID = "";
  row._FWCI = null;
  row._CITE_PERCENTILE = null;
  row._TOP_1PCT = false;
  row._TOP_10PCT = false;
  row._GLOBAL_SOUTH = null;
  row._CONTINENTS = "";
  row._N_COUNTRIES = null;
  row._N_INSTITUTIONS = null;
  row._INST_TYPES = "";
  row._CITE_TRAJECTORY = "";
  row._RETRACTED = false;
  row._SDG = "";
  row._INDEXED = "";
  row._OA_URL = "";

  return row as Partial<BibWork>;
}

// ---------------------------------------------------------------------------
// Query builder (port of build_query)
// ---------------------------------------------------------------------------

export function buildWosQuery(params: WosSearchParams): string {
  if (params.rawQuery) return params.rawQuery;

  const parts: string[] = [];
  if (params.topic) parts.push(`TS=(${params.topic})`);
  if (params.author) parts.push(`AU=(${params.author})`);
  if (params.source) parts.push(`SO=(${params.source})`);
  if (params.organization) parts.push(`OG=(${params.organization})`);
  if (params.doi) parts.push(`DO=(${params.doi})`);

  const ys = params.yearStart;
  const ye = params.yearEnd;
  if (ys && ye) {
    parts.push(ys === ye ? `PY=${ys}` : `PY=${ys}-${ye}`);
  } else if (ys) {
    parts.push(`PY=${ys}-${new Date().getFullYear()}`);
  } else if (ye) {
    parts.push(`PY=1900-${ye}`);
  }

  return parts.join(" AND ");
}

// ---------------------------------------------------------------------------
// API request via proxy
// ---------------------------------------------------------------------------

async function wosApiRequest(
  apiKey: string,
  query: string,
  db: string,
  limit: number,
  page: number,
  sortField: string,
): Promise<Record<string, unknown>> {
  const url = new URL(WOS_PROXY, window.location.origin);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("db", db);
  url.searchParams.set("limit", String(Math.min(limit, PAGE_SIZE)));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sortField", sortField);

  const resp = await fetch(url.toString());
  if (resp.status === 401) throw new Error("API Key inválida ou ausente. Verifique sua chave Clarivate.");
  if (resp.status === 400) {
    const data = await resp.json().catch(() => ({}));
    const err = (data as Record<string, unknown>).error as Record<string, unknown> | undefined;
    const detail = err?.details ?? err?.title ?? "Requisição inválida";
    throw new Error(`Erro na busca: ${detail}`);
  }
  if (!resp.ok) throw new Error(`Erro HTTP ${resp.status}`);
  return resp.json();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getWosCount(apiKey: string, query: string, db = "WOS"): Promise<number> {
  const data = await wosApiRequest(apiKey, query, db, 1, 1, "RS+D");
  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  return Number(meta.total ?? 0);
}

export async function fetchWosWorks(
  params: WosSearchParams,
  onProgress?: (fetched: number, total: number) => void,
): Promise<Partial<BibWork>[]> {
  const query = buildWosQuery(params);
  if (!query) throw new Error("Nenhum critério de busca definido.");

  const db = params.database ?? "WOS";
  const sortField = params.sortField ?? "RS+D";
  const maxRecords = params.maxRecords ?? 1000;

  const firstPage = await wosApiRequest(params.apiKey, query, db, PAGE_SIZE, 1, sortField);
  const meta = (firstPage.metadata ?? {}) as Record<string, unknown>;
  const total = Number(meta.total ?? 0);
  if (total === 0) return [];

  const toFetch = Math.min(total, maxRecords);
  const totalPages = Math.ceil(toFetch / PAGE_SIZE);

  const hits = (firstPage.hits ?? []) as Record<string, unknown>[];
  const allRows: Partial<BibWork>[] = hits.map(documentToRow);
  onProgress?.(allRows.length, toFetch);

  for (let pg = 2; pg <= totalPages; pg++) {
    await new Promise((r) => setTimeout(r, 220)); // rate limit ~5 req/s
    try {
      const pageData = await wosApiRequest(params.apiKey, query, db, PAGE_SIZE, pg, sortField);
      const pageHits = (pageData.hits ?? []) as Record<string, unknown>[];
      for (const doc of pageHits) {
        if (allRows.length >= toFetch) break;
        allRows.push(documentToRow(doc));
      }
    } catch {
      break; // stop on error, return what we have
    }
    onProgress?.(allRows.length, toFetch);
  }

  // Deduplicate by UT
  const seen = new Set<string>();
  return allRows.filter((w) => {
    const ut = String(w.UT ?? "");
    if (!ut || seen.has(ut)) return false;
    seen.add(ut);
    return true;
  });
}

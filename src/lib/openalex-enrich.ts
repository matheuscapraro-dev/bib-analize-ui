/**
 * OpenAlex enrichment for Web of Science records.
 * Port of bib-analize/app/utils/openalex_api.py (enrich_dataframe) to TypeScript.
 *
 * Takes WoS BibWork records, batch-fetches matching works from OpenAlex by DOI,
 * and fills missing fields: AB, C1, C3, LA, ID, CR, NR, FU, OA, WC, SC, etc.
 */
import type { BibWork } from "@/types/bibliometric";
import { LANG_MAP, OA_STATUS_MAP } from "./constants";

const OPENALEX_BASE = "https://api.openalex.org";
const BATCH_SIZE = 50;
const CONTACT_EMAIL = "bibliometrics@analysis.app";
const ENRICH_CONCURRENCY = 3;  // max concurrent batch requests
const ENRICH_DELAY = 150;       // ms between concurrent waves

function invertAbstract(inverted: Record<string, number[]> | null): string {
  if (!inverted) return "";
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, w]) => w).join(" ");
}

interface EnrichFields {
  AB?: string;
  LA?: string;
  C1?: string;
  C3?: string;
  ID?: string;
  CR?: string;
  NR?: number;
  FU?: string;
  OA?: string;
  _OA_URL?: string;
  WC?: string;
  SC?: string;
  _FWCI?: number | null;
  _CITE_PERCENTILE?: number | null;
  _TOP_1PCT?: boolean;
  _TOP_10PCT?: boolean;
  _SDG?: string;
  _INDEXED?: string;
  _CITE_TRAJECTORY?: string;
  _RETRACTED?: boolean;
  _N_COUNTRIES?: number | null;
  _N_INSTITUTIONS?: number | null;
  _INST_TYPES?: string;
  _CONTINENTS?: string;
}

function extractEnrichment(work: Record<string, unknown>): { doiNorm: string; fields: EnrichFields } {
  const doiRaw = String(work.doi ?? "");
  const doiNorm = doiRaw.replace("https://doi.org/", "").trim().toLowerCase();
  const f: EnrichFields = {};

  // Abstract
  const aii = work.abstract_inverted_index as Record<string, number[]> | null;
  if (aii) f.AB = invertAbstract(aii);

  // Language
  const lang = String(work.language ?? "");
  if (lang) f.LA = LANG_MAP[lang] ?? lang.toUpperCase();

  // Authorships → C1, C3
  const authorships = (work.authorships ?? []) as Record<string, unknown>[];
  const c1Parts: string[] = [];
  const c3Set = new Set<string>();
  const countriesSet = new Set<string>();
  const instTypesSet = new Set<string>();

  for (const a of authorships) {
    const author = (a.author ?? {}) as Record<string, unknown>;
    const authorName = String(author.display_name ?? "");

    const rawAffs = (a.raw_affiliation_strings ?? []) as string[];
    for (const aff of rawAffs) {
      if (aff && authorName) c1Parts.push(`[${authorName}] ${aff}`);
      else if (aff) c1Parts.push(aff);
    }

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

  if (c1Parts.length) f.C1 = c1Parts.join("; ");
  if (c3Set.size) f.C3 = [...c3Set].sort().join("; ");
  if (instTypesSet.size) f._INST_TYPES = [...instTypesSet].sort().join("; ");
  f._N_COUNTRIES = (work.countries_distinct_count as number) ?? null;
  f._N_INSTITUTIONS = (work.institutions_distinct_count as number) ?? null;

  // Keywords
  const keywords = (work.keywords ?? []) as Record<string, unknown>[];
  if (keywords.length) {
    const kwNames = keywords.map((k) => String(k.display_name ?? "")).filter(Boolean);
    if (kwNames.length) f.ID = kwNames.join("; ");
  }

  // References
  const refWorks = (work.referenced_works ?? []) as string[];
  const refCount = Number(work.referenced_works_count ?? 0);
  if (refWorks.length) {
    f.CR = refWorks.join("; ");
    f.NR = refWorks.length;
  } else if (refCount) {
    f.NR = refCount;
  }

  // Funding
  const funders = (work.funders ?? []) as Record<string, unknown>[];
  const fuParts: string[] = [];
  const seenFunders = new Set<string>();
  for (const fn of funders) {
    const fname = String(fn.display_name ?? "");
    if (fname && !seenFunders.has(fname)) {
      seenFunders.add(fname);
      fuParts.push(fname);
    }
  }
  if (fuParts.length) f.FU = fuParts.join("; ");

  // Open Access
  const oa = (work.open_access ?? {}) as Record<string, unknown>;
  const oaStatus = String(oa.oa_status ?? "");
  if (oaStatus) f.OA = OA_STATUS_MAP[oaStatus] ?? oaStatus;
  const oaUrl = String(oa.oa_url ?? "");
  if (oaUrl) f._OA_URL = oaUrl;

  // Topics → WC, SC
  const topics = (work.topics ?? []) as Record<string, unknown>[];
  if (topics.length) {
    const subfields = new Set<string>();
    const fields = new Set<string>();
    for (const t of topics) {
      const sf = (t.subfield ?? {}) as Record<string, unknown>;
      if (sf.display_name) subfields.add(String(sf.display_name));
      const fd = (t.field ?? {}) as Record<string, unknown>;
      if (fd.display_name) fields.add(String(fd.display_name));
    }
    if (subfields.size) f.WC = [...subfields].sort().join("; ");
    if (fields.size) f.SC = [...fields].sort().join("; ");
  }

  // Citation metrics
  f._FWCI = (work.fwci as number) ?? null;
  const cnp = (work.citation_normalized_percentile ?? {}) as Record<string, unknown>;
  f._CITE_PERCENTILE = (cnp.value as number) ?? null;
  f._TOP_1PCT = (cnp.is_in_top_1_percent as boolean) ?? false;
  f._TOP_10PCT = (cnp.is_in_top_10_percent as boolean) ?? false;

  // SDG
  const sdgs = (work.sustainable_development_goals ?? []) as Record<string, unknown>[];
  if (sdgs.length) f._SDG = sdgs.map((s) => String(s.display_name ?? "")).filter(Boolean).join("; ");

  // Indexed In
  const indexedIn = (work.indexed_in ?? []) as string[];
  if (indexedIn.length) f._INDEXED = indexedIn.join("; ");

  // Citation trajectory
  const cby = work.counts_by_year as unknown[];
  if (cby?.length) f._CITE_TRAJECTORY = JSON.stringify(cby);

  f._RETRACTED = (work.is_retracted as boolean) ?? false;

  return { doiNorm, fields: f };
}

async function batchLookupDois(
  dois: string[],
  email?: string,
  apiKey?: string,
): Promise<Record<string, unknown>[]> {
  if (!dois.length) return [];

  const doiUrls = dois.map((d) => `https://doi.org/${d.trim()}`).filter(Boolean).join("|");
  if (!doiUrls) return [];

  const urlParams = new URLSearchParams();
  urlParams.set("filter", `doi:${doiUrls}`);
  urlParams.set("per_page", String(Math.min(dois.length, 100)));
  if (apiKey) urlParams.set("api_key", apiKey);
  else urlParams.set("mailto", email || CONTACT_EMAIL);

  const resp = await fetch(`${OPENALEX_BASE}/works?${urlParams}`);
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.results ?? []) as Record<string, unknown>[];
}

export async function enrichWithOpenAlex(
  works: Partial<BibWork>[],
  onProgress?: (enriched: number, total: number) => void,
  email?: string,
  apiKey?: string,
): Promise<Partial<BibWork>[]> {
  // Extract valid DOIs
  const doisWithIdx: { doi: string; idx: number }[] = [];
  for (let i = 0; i < works.length; i++) {
    const doi = String(works[i].DI ?? "").trim();
    if (doi) doisWithIdx.push({ doi, idx: i });
  }

  if (!doisWithIdx.length) return works;

  // Split into batches
  const batches: { doi: string; idx: number }[][] = [];
  for (let i = 0; i < doisWithIdx.length; i += BATCH_SIZE) {
    batches.push(doisWithIdx.slice(i, i + BATCH_SIZE));
  }

  // Build enrichment map — concurrent waves of ENRICH_CONCURRENCY batches
  const enrichMap = new Map<string, EnrichFields>();
  let enrichedCount = 0;

  for (let i = 0; i < batches.length; i += ENRICH_CONCURRENCY) {
    const wave = batches.slice(i, i + ENRICH_CONCURRENCY);
    if (i > 0) await new Promise((r) => setTimeout(r, ENRICH_DELAY));

    const waveResults = await Promise.all(
      wave.map(async (batch) => {
        try {
          return await batchLookupDois(
            batch.map((d) => d.doi),
            email,
            apiKey,
          );
        } catch {
          return [];
        }
      }),
    );

    for (const oaWorks of waveResults) {
      for (const oaWork of oaWorks) {
        const { doiNorm, fields } = extractEnrichment(oaWork);
        if (doiNorm) {
          enrichMap.set(doiNorm, fields);
          enrichedCount++;
        }
      }
    }
    onProgress?.(enrichedCount, doisWithIdx.length);
  }

  if (!enrichMap.size) return works;

  // Apply enrichment — only fill empty fields
  const enrichKeys: (keyof EnrichFields)[] = [
    "AB", "LA", "C1", "C3", "ID", "CR", "NR", "FU", "OA", "WC", "SC",
    "_OA_URL", "_FWCI", "_CITE_PERCENTILE", "_TOP_1PCT", "_TOP_10PCT",
    "_SDG", "_INDEXED", "_CITE_TRAJECTORY", "_RETRACTED",
    "_N_COUNTRIES", "_N_INSTITUTIONS", "_INST_TYPES", "_CONTINENTS",
  ];

  const result = works.map((w) => {
    const doi = String(w.DI ?? "").trim().toLowerCase();
    if (!doi) return w;
    const enriched = enrichMap.get(doi);
    if (!enriched) return w;

    const copy = { ...w };
    for (const key of enrichKeys) {
      const current = copy[key];
      const newVal = enriched[key];
      if (newVal != null && newVal !== "" && newVal !== false) {
        // Only fill if current is empty/null/undefined/0
        if (current == null || current === "" || current === 0 || current === false) {
          (copy as Record<string, unknown>)[key] = newVal;
        }
      }
    }
    return copy;
  });

  return result;
}

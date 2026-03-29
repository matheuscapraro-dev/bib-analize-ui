import type {
  BibWork, YearlyStats, AuthorMetric, LotkaResult, BradfordResult,
  NetworkData, NetworkNode, NetworkEdge, KpiData,
} from "@/types/bibliometric";
import { getColFromArray, safeSplit, normalizeCountry } from "./parser";
import { COUNTRY_ISO } from "./constants";

// ── helpers ─────────────────────────────────────────────────

function val(work: BibWork, key: string): string {
  const v = work[key];
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function numVal(work: BibWork, key: string): number {
  const v = work[key];
  return typeof v === "number" ? v : Number(v) || 0;
}

function yearCol(data: BibWork[]): string {
  return getColFromArray(data, "PY") ?? "Ano de Publicação";
}

function citCol(data: BibWork[]): string {
  return getColFromArray(data, "Z9") ?? getColFromArray(data, "TC") ?? "Citações Total";
}

// ── Extractors ──────────────────────────────────────────────

export function extractAuthors(data: BibWork[], useFullNames = false): string[] {
  const field = useFullNames
    ? getColFromArray(data, "AF") ?? getColFromArray(data, "AU") ?? "Autores"
    : getColFromArray(data, "AU") ?? "Autores";
  return data.flatMap((w) => safeSplit(val(w, field)));
}

export function extractKeywords(data: BibWork[], field = "DE"): string[] {
  const col = getColFromArray(data, field) ?? (field === "DE" ? "Palavras-chave do Autor" : "Keywords Plus");
  return data.flatMap((w) => safeSplit(val(w, col)).map((k) => k.toLowerCase()));
}

export function extractCountries(data: BibWork[]): { index: number; país: string }[] {
  const col = getColFromArray(data, "C1") ?? getColFromArray(data, "RP");
  if (!col) return [];
  const results: { index: number; país: string }[] = [];
  data.forEach((w, idx) => {
    const addr = val(w, col);
    if (!addr) return;
    const seen = new Set<string>();
    for (const part of addr.split("; ")) {
      const elements = part.split(", ");
      if (!elements.length) continue;
      let country = elements[elements.length - 1].trim().replace(/\.$/, "");
      if (country.length <= 2 || /^\d+$/.test(country) || country.includes("@")) continue;
      country = normalizeCountry(country);
      if (country && !seen.has(country) && country.length < 50) {
        seen.add(country);
        results.push({ index: idx, país: country });
      }
    }
  });
  return results;
}

export function extractInstitutions(data: BibWork[]): string[] {
  const col = getColFromArray(data, "C3") ?? "Afiliações";
  return data.flatMap((w) => safeSplit(val(w, col)));
}

// ── KPIs ────────────────────────────────────────────────────

export function computeKpis(data: BibWork[]): KpiData {
  const yc = yearCol(data);
  const cc = citCol(data);
  const authors = new Set(extractAuthors(data));
  const journals = new Set(data.map((w) => val(w, getColFromArray(data, "SO") ?? "Periódico")).filter(Boolean));
  const years = data.map((w) => numVal(w, yc)).filter((y) => y > 1900);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  const totalCit = data.reduce((sum, w) => sum + numVal(w, cc), 0);

  return {
    totalWorks: data.length,
    uniqueAuthors: authors.size,
    uniqueSources: journals.size,
    yearRange: [minY, maxY] as [number, number],
    totalCitations: totalCit,
    meanCitations: data.length ? Math.round((totalCit / data.length) * 10) / 10 : 0,
  };
}

// ── Yearly Stats ────────────────────────────────────────────

export function yearlyStats(data: BibWork[]): YearlyStats[] {
  const yc = yearCol(data);
  const cc = citCol(data);
  const byYear = new Map<number, { pubs: number; cits: number }>();

  for (const w of data) {
    const y = numVal(w, yc);
    if (y < 1900) continue;
    const entry = byYear.get(y) ?? { pubs: 0, cits: 0 };
    entry.pubs++;
    entry.cits += numVal(w, cc);
    byYear.set(y, entry);
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);
  let accumPubs = 0;
  let accumCits = 0;
  let prevPubs = 0;

  return years.map((y) => {
    const e = byYear.get(y)!;
    accumPubs += e.pubs;
    accumCits += e.cits;
    const growth = prevPubs > 0 ? Math.round(((e.pubs - prevPubs) / prevPubs) * 1000) / 10 : 0;
    prevPubs = e.pubs;
    return {
      year: y,
      count: e.pubs,
      totalCitations: e.cits,
      avgCitations: e.pubs > 0 ? Math.round((e.cits / e.pubs) * 10) / 10 : 0,
      cumulativeCount: accumPubs,
      cumulativeCitations: accumCits,
      growth,
    };
  });
}

// ── Lotka's Law ─────────────────────────────────────────────

export function lotkaLaw(data: BibWork[]): LotkaResult {
  const authors = extractAuthors(data);
  if (!authors.length) {
    return { exponent: 0, observed: [], expected: [], totalAuthors: 0, coreCount: 0 };
  }
  const counts = new Map<string, number>();
  for (const a of authors) counts.set(a, (counts.get(a) ?? 0) + 1);

  // frequency distribution: how many authors have exactly n publications
  const freqMap = new Map<number, number>();
  for (const c of counts.values()) freqMap.set(c, (freqMap.get(c) ?? 0) + 1);
  const observed = [...freqMap.entries()]
    .map(([docs, authors]) => ({ docs, authors }))
    .sort((a, b) => a.docs - b.docs);

  // estimate Lotka exponent via log-log regression
  const logX = observed.map((o) => Math.log(o.docs));
  const logY = observed.map((o) => Math.log(o.authors));
  const n = logX.length;
  const sumX = logX.reduce((s, v) => s + v, 0);
  const sumY = logY.reduce((s, v) => s + v, 0);
  const sumXY = logX.reduce((s, v, i) => s + v * logY[i], 0);
  const sumX2 = logX.reduce((s, v) => s + v * v, 0);
  const exponent = n > 1 ? -((n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)) : 2;
  const intercept = n > 0 ? Math.exp((sumY + exponent * sumX) / n) : 0;

  const expected = observed.map((o) => ({
    docs: o.docs,
    authors: Math.round(intercept / Math.pow(o.docs, exponent)),
  }));

  const nMax = Math.max(...counts.values());
  const m = 0.749 * Math.sqrt(nMax);
  const coreCount = [...counts.values()].filter((c) => c >= m).length;

  return { exponent, observed, expected, totalAuthors: counts.size, coreCount };
}

// ── Bradford's Law ──────────────────────────────────────────

export function bradfordLaw(data: BibWork[]): BradfordResult {
  const col = getColFromArray(data, "SO") ?? "Periódico";
  const counts = new Map<string, number>();
  for (const w of data) {
    const j = val(w, col);
    if (j) counts.set(j, (counts.get(j) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, c]) => s + c, 0);
  const third = total / 3;
  let accum = 0;

  const zoneAssignments: number[] = [];
  for (const [, articles] of sorted) {
    accum += articles;
    zoneAssignments.push(accum <= third ? 0 : accum <= 2 * third ? 1 : 2);
  }

  const zones: { sources: number; articles: number }[] = [
    { sources: 0, articles: 0 },
    { sources: 0, articles: 0 },
    { sources: 0, articles: 0 },
  ];
  for (let i = 0; i < sorted.length; i++) {
    const z = zoneAssignments[i];
    zones[z].sources++;
    zones[z].articles += sorted[i][1];
  }

  return { zones, totalJournals: sorted.length };
}

// ── H-Index ─────────────────────────────────────────────────

export function calculateHIndex(citations: number[]): number {
  const sorted = [...citations].sort((a, b) => b - a);
  let h = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= i + 1) h = i + 1;
    else break;
  }
  return h;
}

// ── Author Metrics ──────────────────────────────────────────

export function authorMetrics(data: BibWork[]): AuthorMetric[] {
  const auCol = getColFromArray(data, "AU") ?? "Autores";
  const cc = citCol(data);
  const yc = yearCol(data);

  const records: { author: string; citations: number; year: number }[] = [];

  for (const w of data) {
    const auStr = val(w, auCol);
    if (!auStr) continue;
    const authors = auStr.split("; ").map((a) => a.trim()).filter(Boolean);
    const cit = numVal(w, cc);
    const year = numVal(w, yc);
    for (const author of authors) {
      records.push({ author, citations: cit, year });
    }
  }

  const grouped = new Map<string, { cits: number[]; years: number[] }>();
  for (const r of records) {
    const entry = grouped.get(r.author) ?? { cits: [], years: [] };
    entry.cits.push(r.citations);
    entry.years.push(r.year);
    grouped.set(r.author, entry);
  }

  return [...grouped.entries()]
    .map(([author, e]) => ({
      name: author,
      count: e.cits.length,
      citations: e.cits.reduce((s, c) => s + c, 0),
      avgCitations: Math.round((e.cits.reduce((s, c) => s + c, 0) / e.cits.length) * 10) / 10,
      firstYear: Math.min(...e.years),
      lastYear: Math.max(...e.years),
      hIndex: calculateHIndex(e.cits),
    }))
    .sort((a, b) => b.count - a.count);
}

// ── Network Builders ────────────────────────────────────────

function buildNetwork(
  nodeEntries: Map<string, { size: number }>,
  edgeMap: Map<string, number>,
  labelKey: string,
): NetworkData {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  const nodeArr = [...nodeEntries.entries()];
  const nodeSet = new Set(nodeArr.map(([k]) => k));

  // Simple community assignment based on connected components
  const adj = new Map<string, Set<string>>();
  for (const key of edgeMap.keys()) {
    const [s, t] = key.split("|||");
    if (!nodeSet.has(s) || !nodeSet.has(t)) continue;
    if (!adj.has(s)) adj.set(s, new Set());
    if (!adj.has(t)) adj.set(t, new Set());
    adj.get(s)!.add(t);
    adj.get(t)!.add(s);
  }

  const communityMap = new Map<string, number>();
  let communityId = 0;
  const visited = new Set<string>();

  for (const node of nodeSet) {
    if (visited.has(node)) continue;
    const queue = [node];
    visited.add(node);
    while (queue.length) {
      const current = queue.shift()!;
      communityMap.set(current, communityId);
      for (const neighbor of adj.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    communityId++;
  }

  // Degree centrality
  const totalNodes = nodeSet.size;
  for (const [id, entry] of nodeArr) {
    const degree = adj.get(id)?.size ?? 0;
    nodes.push({
      id,
      label: id,
      size: entry.size,
      community: communityMap.get(id) ?? 0,
      degree,
      degreeCentrality: totalNodes > 1 ? Math.round((degree / (totalNodes - 1)) * 10000) / 10000 : 0,
      [labelKey]: id,
    });
  }

  for (const [key, weight] of edgeMap.entries()) {
    const [source, target] = key.split("|||");
    if (nodeSet.has(source) && nodeSet.has(target)) {
      edges.push({ source, target, weight });
    }
  }

  return { nodes, edges };
}

export function coauthorshipNetwork(data: BibWork[], topN = 50): NetworkData {
  const auCol = getColFromArray(data, "AU") ?? "Autores";
  const allAuthors = extractAuthors(data);
  const authorCounts = new Map<string, number>();
  for (const a of allAuthors) authorCounts.set(a, (authorCounts.get(a) ?? 0) + 1);

  const topAuthors = new Set(
    [...authorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([a]) => a)
  );

  const edgeMap = new Map<string, number>();
  for (const w of data) {
    const authors = safeSplit(val(w, auCol)).filter((a) => topAuthors.has(a));
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const key = [authors[i], authors[j]].sort().join("|||");
        edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1);
      }
    }
  }

  const nodeEntries = new Map<string, { size: number }>();
  for (const a of topAuthors) nodeEntries.set(a, { size: authorCounts.get(a) ?? 0 });

  return buildNetwork(nodeEntries, edgeMap, "Autor");
}

export function keywordCooccurrenceNetwork(data: BibWork[], field = "DE", minFreq = 5, topN = 50): NetworkData {
  const allKw = extractKeywords(data, field);
  const kwCounts = new Map<string, number>();
  for (const k of allKw) kwCounts.set(k, (kwCounts.get(k) ?? 0) + 1);

  const topKw = new Set(
    [...kwCounts.entries()]
      .filter(([, c]) => c >= minFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([k]) => k)
  );

  const col = getColFromArray(data, field) ?? (field === "DE" ? "Palavras-chave do Autor" : "Keywords Plus");
  const edgeMap = new Map<string, number>();

  for (const w of data) {
    const kws = safeSplit(val(w, col)).map((k) => k.toLowerCase()).filter((k) => topKw.has(k));
    for (let i = 0; i < kws.length; i++) {
      for (let j = i + 1; j < kws.length; j++) {
        if (kws[i] !== kws[j]) {
          const key = [kws[i], kws[j]].sort().join("|||");
          edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const nodeEntries = new Map<string, { size: number }>();
  for (const k of topKw) nodeEntries.set(k, { size: kwCounts.get(k) ?? 0 });

  return buildNetwork(nodeEntries, edgeMap, "Palavra-chave");
}

export function countryCollaborationNetwork(data: BibWork[], topN = 30): NetworkData {
  const col = getColFromArray(data, "C1") ?? getColFromArray(data, "RP");
  if (!col) return { nodes: [], edges: [] };

  const countryGroups: string[][] = [];
  const flatCountries: string[] = [];

  for (const w of data) {
    const addr = val(w, col);
    if (!addr) continue;
    const countries = new Set<string>();
    for (const part of addr.split("; ")) {
      const elements = part.split(", ");
      if (!elements.length) continue;
      let c = elements[elements.length - 1].trim().replace(/\.$/, "");
      if (c.length <= 2 || /^\d+$/.test(c) || c.includes("@") || c.length >= 50) continue;
      c = normalizeCountry(c);
      if (c) countries.add(c);
    }
    const arr = [...countries];
    flatCountries.push(...arr);
    if (arr.length > 1) countryGroups.push(arr);
  }

  const countryCounts = new Map<string, number>();
  for (const c of flatCountries) countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);

  const topCountries = new Set(
    [...countryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([c]) => c)
  );

  const edgeMap = new Map<string, number>();
  for (const group of countryGroups) {
    const relevant = group.filter((c) => topCountries.has(c));
    for (let i = 0; i < relevant.length; i++) {
      for (let j = i + 1; j < relevant.length; j++) {
        const key = [relevant[i], relevant[j]].sort().join("|||");
        edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1);
      }
    }
  }

  const nodeEntries = new Map<string, { size: number }>();
  for (const c of topCountries) nodeEntries.set(c, { size: countryCounts.get(c) ?? 0 });

  return buildNetwork(nodeEntries, edgeMap, "País");
}

export function institutionCollaborationNetwork(data: BibWork[], topN = 30): NetworkData {
  const col = getColFromArray(data, "C3") ?? getColFromArray(data, "C1");
  if (!col) return { nodes: [], edges: [] };

  const instGroups: string[][] = [];
  const flatInsts: string[] = [];

  for (const w of data) {
    const raw = val(w, col);
    if (!raw) continue;
    const insts = raw.split("; ").map((s) => s.trim()).filter(Boolean);
    flatInsts.push(...insts);
    if (insts.length > 1) instGroups.push(insts);
  }

  const instCounts = new Map<string, number>();
  for (const i of flatInsts) instCounts.set(i, (instCounts.get(i) ?? 0) + 1);

  const topInsts = new Set(
    [...instCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([i]) => i)
  );

  const edgeMap = new Map<string, number>();
  for (const group of instGroups) {
    const relevant = group.filter((i) => topInsts.has(i));
    for (let i = 0; i < relevant.length; i++) {
      for (let j = i + 1; j < relevant.length; j++) {
        if (relevant[i] !== relevant[j]) {
          const key = [relevant[i], relevant[j]].sort().join("|||");
          edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const nodeEntries = new Map<string, { size: number }>();
  for (const i of topInsts) nodeEntries.set(i, { size: instCounts.get(i) ?? 0 });

  return buildNetwork(nodeEntries, edgeMap, "Instituição");
}

// ── Utility functions for pages ─────────────────────────────

export function topN(data: Map<string, number>, n: number): [string, number][] {
  return [...data.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function countValues(data: BibWork[], field: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of data) {
    const raw = val(w, field);
    if (!raw) continue;
    for (const part of safeSplit(raw)) {
      const norm = part.trim();
      if (norm) map.set(norm, (map.get(norm) ?? 0) + 1);
    }
  }
  return map;
}

export function getCountryIso(country: string): string | undefined {
  return COUNTRY_ISO[country];
}

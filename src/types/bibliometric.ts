export interface BibWork {
  UT: string;
  DI: string;
  TI: string;
  AU: string;
  AF: string;
  SO: string;
  PY: number;
  DT: string;
  LA: string;
  AB: string;
  DE: string;
  ID: string;
  C1: string;
  C3: string;
  CR: string;
  NR: number;
  TC: number;
  Z9: number;
  FU: string;
  OA: string;
  WC: string;
  SC: string;
  SN: string;
  EI: string;
  VL: string;
  IS: string;
  BP: string;
  EP: string;
  PG: number | null;
  _FWCI: number | null;
  _CITE_PERCENTILE: number | null;
  _TOP_1PCT: boolean;
  _TOP_10PCT: boolean;
  _GLOBAL_SOUTH: boolean | null;
  _CONTINENTS: string;
  _N_COUNTRIES: number | null;
  _N_INSTITUTIONS: number | null;
  _INST_TYPES: string;
  _CITE_TRAJECTORY: string;
  _RETRACTED: boolean;
  _SDG: string;
  _INDEXED: string;
  _OA_URL: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface YearlyStats {
  year: number;
  count: number;
  totalCitations: number;
  avgCitations: number;
  cumulativeCount: number;
  cumulativeCitations: number;
  growth: number;
}

export interface AuthorMetric {
  name: string;
  count: number;
  citations: number;
  avgCitations: number;
  firstYear: number;
  lastYear: number;
  hIndex: number;
}

export interface LotkaResult {
  exponent: number;
  observed: { docs: number; authors: number }[];
  expected: { docs: number; authors: number }[];
  totalAuthors: number;
  coreCount: number;
}

export interface BradfordResult {
  zones: { sources: number; articles: number }[];
  totalJournals: number;
}

export interface NetworkNode {
  id: string;
  label: string;
  size: number;
  community: number;
  degree?: number;
  degreeCentrality?: number;
  betweennessCentrality?: number;
  [key: string]: string | number | undefined;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export type DataSource = "openalex" | "upload" | "wos";

export interface SavedAnalysis {
  id: string;
  name: string;
  source: DataSource;
  fileName?: string;
  searchParams?: Record<string, unknown>;
  worksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedAnalysisRecord extends SavedAnalysis {
  works: BibWork[];
}

export interface FilterState {
  yearRange: [number, number];
  docTypes: string[];
  languages: string[];
  oaStatuses: string[];
  search: string;
}

export interface KpiData {
  totalWorks: number;
  uniqueAuthors: number;
  uniqueSources: number;
  yearRange: [number, number];
  totalCitations: number;
  meanCitations: number;
}

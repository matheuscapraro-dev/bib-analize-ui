import { FIELD_MAP, NUMERIC_FIELDS, COUNTRY_NORMALIZE } from "./constants";
import type { BibWork } from "@/types/bibliometric";

const MULTILINE_JOIN_SEMI = new Set(["AU", "AF", "BA", "BF", "BE", "C1", "C3"]);
const MULTILINE_JOIN_NEWLINE = new Set(["CR"]);

function detectFormat(text: string): "tagged" | "tab-delimited" {
  const firstLine = text.split("\n", 1)[0].trim();
  if (firstLine.startsWith("FN ") || firstLine.startsWith("FN\t")) {
    const lines = text.split("\n", 6);
    for (const line of lines.slice(1, 4)) {
      const stripped = line.trim();
      if (stripped && stripped.length >= 2) {
        const tag = stripped.substring(0, 2);
        const rest = stripped.length > 2 ? stripped[2] : "";
        if (/^[A-Z]{2}$/.test(tag) && (rest === " " || rest === "" || stripped === "ER")) {
          return "tagged";
        }
      }
    }
    if ((firstLine.match(/\t/g) || []).length > 5) return "tab-delimited";
    return "tagged";
  }
  if (firstLine.includes("\t") && (firstLine.match(/\t/g) || []).length > 3) {
    return "tab-delimited";
  }
  return "tagged";
}

function parseWosTagged(text: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  let currentTag: string | null = null;

  for (const line of text.split("\n")) {
    if (line.startsWith("FN ") || line.startsWith("VR ") || line.startsWith("EF")) continue;
    const stripped = line.trimEnd();

    if (stripped === "ER") {
      if (Object.keys(current).length > 0) records.push(current);
      current = {};
      currentTag = null;
      continue;
    }

    if (stripped.length >= 3 && /^[A-Z]{2}$/.test(stripped.substring(0, 2)) && stripped[2] === " ") {
      currentTag = stripped.substring(0, 2);
      const value = stripped.substring(3);
      if (current[currentTag] !== undefined) {
        const sep = MULTILINE_JOIN_NEWLINE.has(currentTag) || MULTILINE_JOIN_SEMI.has(currentTag) ? "; " : " ";
        current[currentTag] += sep + value;
      } else {
        current[currentTag] = value;
      }
    } else if (stripped.startsWith("   ") && currentTag) {
      const value = stripped.trim();
      const sep = MULTILINE_JOIN_NEWLINE.has(currentTag) || MULTILINE_JOIN_SEMI.has(currentTag) ? "; " : " ";
      current[currentTag] += sep + value;
    }
  }
  if (Object.keys(current).length > 0) records.push(current);
  return records;
}

function parseWosTabDelimited(text: string): Record<string, string>[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map((h) => h.trim().replace(/^\uFEFF/, ""));
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split("\t");
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) record[h] = values[idx] ?? "";
    });
    records.push(record);
  }
  return records;
}

export function parseWosFile(content: string): Record<string, string>[] {
  const fmt = detectFormat(content);
  return fmt === "tagged" ? parseWosTagged(content) : parseWosTabDelimited(content);
}

export function renameColumns(records: Record<string, string>[]): Record<string, string>[] {
  return records.map((r) => {
    const renamed: Record<string, string> = {};
    for (const [key, value] of Object.entries(r)) {
      const cleanKey = key.trim();
      renamed[FIELD_MAP[cleanKey] ?? cleanKey] = value;
    }
    return renamed;
  });
}

export function cleanData(records: Record<string, string>[]): BibWork[] {
  const numericPtFields = NUMERIC_FIELDS.map((f) => FIELD_MAP[f] ?? f);
  return records
    .map((r) => {
      const work = { ...r } as Record<string, unknown>;
      for (const field of [...NUMERIC_FIELDS, ...numericPtFields]) {
        if (work[field] !== undefined && work[field] !== "") {
          work[field] = Number(work[field]) || 0;
        }
      }
      for (const col of ["Citações Total", "Citações WoS Core", "Z9", "TC"]) {
        if (work[col] !== undefined) work[col] = Number(work[col]) || 0;
      }
      const yearCol = work["Ano de Publicação"] !== undefined ? "Ano de Publicação" : "PY";
      const year = Number(work[yearCol]);
      if (isNaN(year) || year < 1900) return null;
      work[yearCol] = year;
      return work as unknown as BibWork;
    })
    .filter(Boolean) as BibWork[];
}

export function consolidateFiles(files: { name: string; content: string }[]): Record<string, string>[] {
  const allRecords: Record<string, string>[] = [];
  for (const f of files) {
    const records = parseWosFile(f.content);
    allRecords.push(...records);
  }
  const seen = new Set<string>();
  return allRecords.filter((r) => {
    const ut = r.UT || r["ID Único WoS"];
    if (!ut) return true;
    if (seen.has(ut)) return false;
    seen.add(ut);
    return true;
  });
}

export function processUpload(files: { name: string; content: string }[]): BibWork[] {
  const consolidated = consolidateFiles(files);
  const renamed = renameColumns(consolidated);
  return cleanData(renamed);
}

export function getCol(work: BibWork, wosCode: string): string | undefined {
  const ptName = FIELD_MAP[wosCode] ?? wosCode;
  if (work[ptName] !== undefined) return ptName;
  if (work[wosCode] !== undefined) return wosCode;
  return undefined;
}

export function getColFromArray(data: BibWork[], wosCode: string): string | undefined {
  if (!data.length) return undefined;
  return getCol(data[0], wosCode);
}

export function safeSplit(value: string | undefined | null, sep = "; "): string[] {
  if (!value || typeof value !== "string") return [];
  return value.split(sep).map((s) => s.trim()).filter(Boolean);
}

export function normalizeCountry(country: string): string {
  const upper = country.trim().toUpperCase();
  return COUNTRY_NORMALIZE[upper] ?? country.trim().replace(/\b\w/g, (l) => l.toUpperCase());
}

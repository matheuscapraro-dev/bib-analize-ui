import type { BibWork } from "@/types/bibliometric";

type AstNode =
  | { kind: "WORD"; value: string }
  | { kind: "PHRASE"; value: string }
  | { kind: "AND"; left: AstNode; right: AstNode }
  | { kind: "OR"; left: AstNode; right: AstNode }
  | { kind: "NOT"; operand: AstNode };

type Token = "AND" | "OR" | "NOT" | "(" | ")" | { kind: "WORD" | "PHRASE"; value: string };

function tokenizeBoolean(query: string): Token[] {
  const tokens: Token[] = [];
  const q = query.trim();
  let i = 0;
  while (i < q.length) {
    if (/\s/.test(q[i])) { i++; continue; }
    if (q[i] === "(") { tokens.push("("); i++; continue; }
    if (q[i] === ")") { tokens.push(")"); i++; continue; }
    if (q[i] === '"') {
      let j = q.indexOf('"', i + 1);
      if (j === -1) j = q.length;
      tokens.push({ kind: "PHRASE", value: q.slice(i + 1, j).toLowerCase() });
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < q.length && !/\s/.test(q[j]) && q[j] !== "(" && q[j] !== ")" && q[j] !== '"') j++;
    const word = q.slice(i, j);
    const upper = word.toUpperCase();
    if (upper === "AND") tokens.push("AND");
    else if (upper === "OR") tokens.push("OR");
    else if (upper === "NOT") tokens.push("NOT");
    else tokens.push({ kind: "WORD", value: word.toLowerCase() });
    i = j;
  }
  return tokens;
}

function parseExpr(tokens: Token[], pos: number): [AstNode, number] {
  let [left, p] = parseTerm(tokens, pos);
  while (p < tokens.length && tokens[p] === "OR") {
    p++;
    const [right, np] = parseTerm(tokens, p);
    left = { kind: "OR", left, right };
    p = np;
  }
  return [left, p];
}

function parseTerm(tokens: Token[], pos: number): [AstNode, number] {
  let [left, p] = parseFactor(tokens, pos);
  while (
    p < tokens.length &&
    (tokens[p] === "AND" ||
      (typeof tokens[p] === "object" || tokens[p] === "(" || tokens[p] === "NOT"))
  ) {
    if (tokens[p] === "AND") p++;
    const [right, np] = parseFactor(tokens, p);
    left = { kind: "AND", left, right };
    p = np;
  }
  return [left, p];
}

function parseFactor(tokens: Token[], pos: number): [AstNode, number] {
  if (pos >= tokens.length) return [{ kind: "WORD", value: "" }, pos];
  const tok = tokens[pos];
  if (tok === "NOT") {
    const [operand, p] = parseFactor(tokens, pos + 1);
    return [{ kind: "NOT", operand }, p];
  }
  if (tok === "(") {
    const [node, p] = parseExpr(tokens, pos + 1);
    const np = p < tokens.length && tokens[p] === ")" ? p + 1 : p;
    return [node, np];
  }
  if (typeof tok === "object") {
    return [tok, pos + 1];
  }
  return [{ kind: "WORD", value: "" }, pos + 1];
}

/** Cache compiled regexes for performance (avoids re-compiling on every record). */
const regexCache = new Map<string, RegExp>();

function getWordBoundaryRegex(value: string): RegExp {
  let re = regexCache.get(value);
  if (!re) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${escaped}\\b`);
    regexCache.set(value, re);
  }
  return re;
}

function evalNode(node: AstNode, text: string): boolean {
  switch (node.kind) {
    case "WORD":
    case "PHRASE":
      return getWordBoundaryRegex(node.value).test(text);
    case "AND":
      return evalNode(node.left, text) && evalNode(node.right, text);
    case "OR":
      return evalNode(node.left, text) || evalNode(node.right, text);
    case "NOT":
      return !evalNode(node.operand, text);
  }
}

export function hasBooleanOperators(query: string): boolean {
  const tokens = tokenizeBoolean(query);
  return tokens.some(
    (t) => t === "AND" || t === "OR" || t === "NOT" || t === "(" || t === ")",
  );
}

const TEXT_FIELDS: (keyof BibWork)[] = ["TI", "AB", "DE", "ID"];

/**
 * Build a single lowercase searchable string for a work.
 * Call once per work and reuse to avoid repeated concatenation + toLowerCase().
 */
export function buildSearchableText(w: Partial<BibWork>): string {
  const parts: string[] = [];
  for (const field of TEXT_FIELDS) {
    const v = w[field];
    if (v != null && v !== "") parts.push(String(v));
  }
  return parts.join(" ").toLowerCase();
}

export function booleanPostFilter(
  works: Partial<BibWork>[],
  query: string,
): Partial<BibWork>[] {
  if (!query || !query.trim() || !works.length) return works;
  if (!hasBooleanOperators(query)) return works;

  const tokens = tokenizeBoolean(query);
  const [ast] = parseExpr(tokens, 0);

  return works.filter((w) => {
    const text = (w as Record<string, unknown>)._searchText as string | undefined;
    return evalNode(ast, text ?? buildSearchableText(w));
  });
}

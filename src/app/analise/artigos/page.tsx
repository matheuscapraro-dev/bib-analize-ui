"use client";

import { useMemo, useState, useCallback } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  FileText, Search, BookOpen, TrendingUp, BarChart3, Star,
  ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";
import type { BibWork } from "@/types/bibliometric";
import type { ColumnDef } from "@tanstack/react-table";

const currentYear = new Date().getFullYear();

function computeRelevance(w: BibWork, maxCit: number, maxCitYr: number): number {
  let score = 0;
  let weights = 0;
  const cit = w.Z9 ?? w.TC ?? 0;
  if (maxCit > 0) { score += (Number(cit) / maxCit) * 35; weights += 35; }
  const y = w.PY ?? currentYear;
  const citYr = y < currentYear ? Number(cit) / Math.max(1, currentYear - y) : 0;
  if (maxCitYr > 0) { score += (citYr / maxCitYr) * 25; weights += 25; }
  const fwci = Number(w._FWCI ?? 0);
  if (fwci > 0) { score += Math.min(fwci / 5, 1) * 20; weights += 20; }
  const pct = Number(w._CITE_PERCENTILE ?? 0);
  if (pct > 0) { score += pct * 20; weights += 20; }
  return weights > 0 ? Math.round((score / weights) * 1000) / 10 : 0;
}

interface ArticleWithScore extends BibWork {
  _score: number;
  _citPerYear: number;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevância" },
  { value: "citations", label: "Citações" },
  { value: "citPerYear", label: "Citações/Ano" },
  { value: "yearDesc", label: "Mais recentes" },
  { value: "yearAsc", label: "Mais antigos" },
] as const;

const tableCols: ColumnDef<ArticleWithScore, unknown>[] = [
  { accessorKey: "TI", header: "Título", cell: ({ getValue }) => {
    const v = String(getValue() ?? "");
    return <span className="line-clamp-2 text-xs">{v}</span>;
  }},
  { accessorKey: "AU", header: "Autores", cell: ({ getValue }) => {
    const v = String(getValue() ?? "");
    const parts = v.split("; ");
    return <span className="text-xs">{parts.length > 2 ? `${parts[0]} et al.` : v}</span>;
  }},
  { accessorKey: "SO", header: "Fonte", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "")}</span> },
  { accessorKey: "PY", header: "Ano" },
  { accessorFn: (r) => r.Z9 ?? r.TC ?? 0, id: "cit", header: "Citações" },
  { accessorKey: "_score", header: "Score", cell: ({ getValue }) => <Badge variant="secondary">{String(getValue())}</Badge> },
];

export default function ArtigosPage() {
  const { filtered } = useBib();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [nResults, setNResults] = useState(50);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Pre-compute scores
  const articlesWithScore = useMemo(() => {
    let maxCit = 0;
    let maxCitYr = 0;
    for (const w of filtered) {
      const cit = Number(w.Z9 ?? w.TC ?? 0);
      if (cit > maxCit) maxCit = cit;
      const y = w.PY ?? currentYear;
      const citYr = y < currentYear ? cit / Math.max(1, currentYear - y) : 0;
      if (citYr > maxCitYr) maxCitYr = citYr;
    }
    return filtered.map((w) => {
      const cit = Number(w.Z9 ?? w.TC ?? 0);
      const y = w.PY ?? currentYear;
      return {
        ...w,
        _score: computeRelevance(w, maxCit, maxCitYr),
        _citPerYear: y < currentYear ? Math.round((cit / Math.max(1, currentYear - y)) * 10) / 10 : 0,
      } as ArticleWithScore;
    });
  }, [filtered]);

  // Search + sort
  const results = useMemo(() => {
    let list = articlesWithScore;
    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
      list = list.filter((w) => {
        const text = `${w.TI ?? ""} ${w.AB ?? ""} ${w.DE ?? ""} ${w.AU ?? ""}`.toLowerCase();
        return terms.some((t) => text.includes(t));
      });
    }
    const sorted = list.slice();
    switch (sortBy) {
      case "relevance": sorted.sort((a, b) => b._score - a._score); break;
      case "citations": sorted.sort((a, b) => (Number(b.Z9 ?? b.TC ?? 0)) - (Number(a.Z9 ?? a.TC ?? 0))); break;
      case "citPerYear": sorted.sort((a, b) => b._citPerYear - a._citPerYear); break;
      case "yearDesc": sorted.sort((a, b) => (b.PY ?? 0) - (a.PY ?? 0)); break;
      case "yearAsc": sorted.sort((a, b) => (a.PY ?? 0) - (b.PY ?? 0)); break;
    }
    return sorted.slice(0, nResults);
  }, [articlesWithScore, searchQuery, sortBy, nResults]);

  const avgCit = useMemo(() => {
    if (!results.length) return 0;
    return Math.round(results.reduce((s, w) => s + Number(w.Z9 ?? w.TC ?? 0), 0) / results.length * 10) / 10;
  }, [results]);

  const avgScore = useMemo(() => {
    if (!results.length) return 0;
    return Math.round(results.reduce((s, w) => s + w._score, 0) / results.length * 10) / 10;
  }, [results]);

  const toggle = useCallback((idx: number) => setExpandedIdx((prev) => prev === idx ? null : idx), []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explorador de Publicações"
        description="Pesquise e identifique as publicações mais relevantes do conjunto de dados."
        badge={`${filtered.length} registros`}
      />

      {/* Search & filters */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, resumo, palavras-chave ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Ordenar:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Exibir:</Label>
              <Select value={String(nResults)} onValueChange={(v) => setNResults(Number(v))}>
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground ml-auto">
              <strong>{results.length}</strong> de {articlesWithScore.length} publicações
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <KpiGrid className="grid-cols-2 sm:grid-cols-4">
        <KpiCard title="Resultados" value={results.length} icon={<FileText className="size-5" />} />
        <KpiCard title="Média de Citações" value={avgCit} icon={<TrendingUp className="size-5" />} />
        <KpiCard title="Score Médio" value={avgScore} icon={<Star className="size-5" />} />
        <KpiCard
          title="Período"
          value={results.length ? `${Math.min(...results.map((r) => r.PY ?? 9999))}–${Math.max(...results.map((r) => r.PY ?? 0))}` : "—"}
          icon={<BarChart3 className="size-5" />}
        />
      </KpiGrid>

      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-3">
          {results.map((w, idx) => {
            const cit = Number(w.Z9 ?? w.TC ?? 0);
            const authors = w.AU ?? w.AF ?? "";
            const authorParts = authors.split("; ");
            const authorsDisplay = authorParts.length > 3
              ? `${authorParts.slice(0, 3).join("; ")} et al. (${authorParts.length})`
              : authors;
            const doi = w.DI ?? "";
            const oaUrl = w._OA_URL ?? "";
            const accessUrl = oaUrl.trim() || (doi.trim() ? `https://doi.org/${doi.trim()}` : "");
            const isExpanded = expandedIdx === idx;

            return (
              <Card key={w.UT || idx} className="overflow-hidden">
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0 mt-0.5">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2">{w.TI ?? "Sem título"}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{authorsDisplay || "—"}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        {w.DT && <Badge variant="outline" className="text-[10px] h-5">{w.DT}</Badge>}
                        {w.SO && <span className="italic truncate max-w-[200px]">{w.SO}</span>}
                        {w.PY && <span>{w.PY}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-xs">{w._score.toFixed(0)}</Badge>
                      {accessUrl && (
                        <a href={accessUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="size-7">
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span><strong>{cit}</strong> citações</span>
                    {w._citPerYear > 0 && <span><strong>{w._citPerYear}</strong> cit./ano</span>}
                    {w._FWCI != null && Number(w._FWCI) > 0 && (
                      <span>FWCI: <strong>{Number(w._FWCI).toFixed(2)}</strong></span>
                    )}
                    {w.OA && w.OA.toLowerCase() !== "closed" && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        <BookOpen className="size-3 mr-0.5" /> {w.OA}
                      </Badge>
                    )}
                  </div>
                  {(w.AB || w.DE) && (
                    <button
                      onClick={() => toggle(idx)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      {isExpanded ? "Ocultar detalhes" : "Ver resumo e palavras-chave"}
                    </button>
                  )}
                  {isExpanded && (
                    <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                      {w.AB && <p><strong>Resumo:</strong> {w.AB}</p>}
                      {w.DE && <p><strong>Palavras-chave:</strong> {w.DE}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {results.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Nenhuma publicação encontrada com os filtros atuais.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="table">
          <DataTable columns={tableCols} data={results} pageSize={20} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

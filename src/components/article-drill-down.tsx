"use client";

import { useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Search, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import type { BibWork } from "@/types/bibliometric";

interface ArticleDrillDownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  articles: BibWork[];
}

const SORT_OPTIONS = [
  { value: "citations", label: "Citações" },
  { value: "yearDesc", label: "Mais recentes" },
  { value: "yearAsc", label: "Mais antigos" },
] as const;

export function ArticleDrillDown({ open, onOpenChange, title, articles }: ArticleDrillDownProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("citations");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const results = useMemo(() => {
    let list = articles;
    if (search.trim()) {
      const terms = search.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
      list = list.filter((w) => {
        const text = `${w.TI ?? ""} ${w.AU ?? ""} ${w.SO ?? ""} ${w.DE ?? ""}`.toLowerCase();
        return terms.some((t) => text.includes(t));
      });
    }
    const sorted = list.slice();
    switch (sortBy) {
      case "citations": sorted.sort((a, b) => (Number(b.Z9 ?? b.TC ?? 0)) - (Number(a.Z9 ?? a.TC ?? 0))); break;
      case "yearDesc": sorted.sort((a, b) => (b.PY ?? 0) - (a.PY ?? 0)); break;
      case "yearAsc": sorted.sort((a, b) => (a.PY ?? 0) - (b.PY ?? 0)); break;
    }
    return sorted;
  }, [articles, search, sortBy]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b space-y-3 shrink-0">
          <div className="pr-8">
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {articles.length} artigo{articles.length !== 1 ? "s" : ""}
              {results.length !== articles.length && ` (${results.length} filtrado${results.length !== 1 ? "s" : ""})`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar título, autor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Article list */}
        <ScrollArea className="flex-1">
          <div className="px-5 py-3 space-y-2">
            {results.map((w, idx) => {
              const cit = Number(w.Z9 ?? w.TC ?? 0);
              const authors = w.AU ?? w.AF ?? "";
              const authorParts = authors.split("; ");
              const authorsDisplay = authorParts.length > 3
                ? `${authorParts.slice(0, 3).join("; ")} et al.`
                : authors;
              const doi = w.DI ?? "";
              const oaUrl = w._OA_URL ?? "";
              const accessUrl = (typeof oaUrl === "string" && oaUrl.trim())
                || (typeof doi === "string" && doi.trim() ? `https://doi.org/${doi.trim()}` : "");
              const isExpanded = expandedIdx === idx;

              return (
                <div key={w.UT || idx} className="rounded-lg border bg-card p-3 space-y-1.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums shrink-0 mt-0.5">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold leading-snug line-clamp-2">{w.TI ?? "Sem título"}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{authorsDisplay || "—"}</p>
                    </div>
                    {accessUrl && (
                      <a href={accessUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="ghost" size="icon" className="size-6">
                          <ExternalLink className="size-3" />
                        </Button>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    {w.SO && <span className="italic truncate max-w-[180px]">{w.SO}</span>}
                    {w.PY && <span>({w.PY})</span>}
                    <span className="font-medium text-foreground">{cit} cit.</span>
                    {w.DT && <Badge variant="outline" className="text-[9px] h-4 px-1">{w.DT}</Badge>}
                    {w.OA && w.OA.toLowerCase() !== "closed" && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        <BookOpen className="size-2.5 mr-0.5" /> {w.OA}
                      </Badge>
                    )}
                  </div>

                  {(w.AB || w.DE) && (
                    <>
                      <button
                        onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                        className="flex items-center gap-0.5 text-[11px] text-primary hover:underline cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        {isExpanded ? "Ocultar" : "Detalhes"}
                      </button>
                      {isExpanded && (
                        <div className="text-[11px] text-muted-foreground space-y-1 pt-1 border-t">
                          {w.AB && <p><strong>Resumo:</strong> {w.AB}</p>}
                          {w.DE && <p><strong>Palavras-chave:</strong> {w.DE}</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {results.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">
                Nenhum artigo encontrado.
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

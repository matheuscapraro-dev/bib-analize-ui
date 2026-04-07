"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fetchOpenAlexWorks,
  searchInstitutions,
  searchAffiliations,
  type OpenAlexInstitution,
  type AffiliationSuggestion,
  type OpenAlexSearchParams,
} from "@/lib/openalex-api";
import { fetchWosWorks, buildWosQuery, type WosSearchParams } from "@/lib/wos-api";
import { enrichJournalMetrics } from "@/lib/scopus-enrich";
import type { BibWork } from "@/types/bibliometric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Globe,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type DataSource = "openalex" | "wos";

interface ProgramEntry {
  id: string;
  name: string;
  affiliationSearch: string;
  query: string;
  confirmed: boolean;
}

const MAX_PROGRAMS = 4;

function generateId() {
  return `prog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Try to extract a short program name from a raw affiliation string. */
function extractProgramName(affiliation: string): string {
  // Match common patterns like "Programa de Pós-Graduação em X" or "PPG..."
  const m =
    affiliation.match(/(?:Programa\s+de\s+Pós[- ]?Graduação\s+em\s+)([^,;]+)/i) ??
    affiliation.match(/(?:Program(?:me)?\s+(?:in|of)\s+)([^,;]+)/i) ??
    affiliation.match(/(PPG\w+)/i) ??
    affiliation.match(/(PPGCA|PPGEB|PPGSE|PPGCC|PPGEE|PPGEM|PPGME)/i);
  if (m) return m[1].trim();
  // Fallback: first segment up to comma, max ~60 chars
  const firstPart = affiliation.split(/[,;]/)[0].trim();
  return firstPart.length > 60 ? firstPart.slice(0, 57) + "..." : firstPart;
}

export default function ProgramasPage() {
  const router = useRouter();

  // Data source
  const [dataSource, setDataSource] = useState<DataSource>("openalex");

  // Institution autocomplete
  const [instQuery, setInstQuery] = useState("");
  const [instResults, setInstResults] = useState<OpenAlexInstitution[]>([]);
  const [instLoading, setInstLoading] = useState(false);
  const [selectedInst, setSelectedInst] = useState<OpenAlexInstitution | null>(null);
  const [showInstDropdown, setShowInstDropdown] = useState(false);
  const instRef = useRef<HTMLDivElement>(null);
  const instDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Programs
  const [programs, setPrograms] = useState<ProgramEntry[]>([
    { id: generateId(), name: "", affiliationSearch: "", query: "", confirmed: false },
    { id: generateId(), name: "", affiliationSearch: "", query: "", confirmed: false },
  ]);

  // Per-program affiliation autocomplete
  const [affResults, setAffResults] = useState<Record<string, AffiliationSuggestion[]>>({});
  const [affLoading, setAffLoading] = useState<Record<string, boolean>>({});
  const [showAffDropdown, setShowAffDropdown] = useState<Record<string, boolean>>({});
  const affDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const affRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Search config
  const [yearStart, setYearStart] = useState(2020);
  const [yearEnd, setYearEnd] = useState(new Date().getFullYear());

  // Loading state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  // ── Institution autocomplete ──
  useEffect(() => {
    if (instDebounceRef.current) clearTimeout(instDebounceRef.current);
    if (!instQuery.trim() || instQuery.length < 2) {
      setInstResults([]);
      return;
    }
    instDebounceRef.current = setTimeout(async () => {
      setInstLoading(true);
      try {
        const results = await searchInstitutions(instQuery, { apiKey: process.env.NEXT_PUBLIC_OPENALEX_API_KEY ?? "" });
        setInstResults(results);
        setShowInstDropdown(true);
      } catch {
        setInstResults([]);
      } finally {
        setInstLoading(false);
      }
    }, 300);
    return () => {
      if (instDebounceRef.current) clearTimeout(instDebounceRef.current);
    };
  }, [instQuery]);

  // Close institution dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (instRef.current && !instRef.current.contains(e.target as Node)) {
        setShowInstDropdown(false);
      }
      // Close any open affiliation dropdown
      for (const [progId, ref] of Object.entries(affRefs.current)) {
        if (ref && !ref.contains(e.target as Node)) {
          setShowAffDropdown((prev) => ({ ...prev, [progId]: false }));
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectInstitution = (inst: OpenAlexInstitution) => {
    setSelectedInst(inst);
    setInstQuery(inst.display_name);
    setShowInstDropdown(false);
  };

  // ── Program affiliation autocomplete ──
  const handleProgramQueryChange = (progId: string, value: string) => {
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === progId ? { ...p, query: value, confirmed: false, affiliationSearch: "", name: "" } : p,
      ),
    );

    // Debounced search
    if (affDebounceRefs.current[progId]) clearTimeout(affDebounceRefs.current[progId]);
    if (!value.trim() || value.length < 2 || !selectedInst) {
      setAffResults((prev) => ({ ...prev, [progId]: [] }));
      return;
    }

    affDebounceRefs.current[progId] = setTimeout(async () => {
      setAffLoading((prev) => ({ ...prev, [progId]: true }));
      try {
        const results = await searchAffiliations(selectedInst.id, value, { apiKey: process.env.NEXT_PUBLIC_OPENALEX_API_KEY ?? "" });
        setAffResults((prev) => ({ ...prev, [progId]: results }));
        setShowAffDropdown((prev) => ({ ...prev, [progId]: true }));
      } catch {
        setAffResults((prev) => ({ ...prev, [progId]: [] }));
      } finally {
        setAffLoading((prev) => ({ ...prev, [progId]: false }));
      }
    }, 400);
  };

  const selectAffiliation = (progId: string, suggestion: AffiliationSuggestion) => {
    const name = extractProgramName(suggestion.text);
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === progId
          ? { ...p, query: suggestion.text, affiliationSearch: suggestion.text, name, confirmed: true }
          : p,
      ),
    );
    setShowAffDropdown((prev) => ({ ...prev, [progId]: false }));
  };

  const clearProgram = (progId: string) => {
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === progId ? { ...p, query: "", affiliationSearch: "", name: "", confirmed: false } : p,
      ),
    );
  };

  const addProgram = () => {
    if (programs.length >= MAX_PROGRAMS) return;
    setPrograms((prev) => [
      ...prev,
      { id: generateId(), name: "", affiliationSearch: "", query: "", confirmed: false },
    ]);
  };

  const removeProgram = (id: string) => {
    if (programs.length <= 2) return;
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSearch = useCallback(async () => {
    if (!selectedInst) {
      toast.warning("Selecione uma instituição.");
      return;
    }

    const validPrograms = programs.filter((p) => p.confirmed && p.affiliationSearch.trim());
    if (validPrograms.length < 2) {
      toast.warning("Selecione pelo menos 2 programas a partir das sugestões.");
      return;
    }

    setLoading(true);
    setProgress("Iniciando busca...");

    try {
      const allWorks: BibWork[] = [];
      const programResults: {
        id: string;
        name: string;
        affiliationSearch: string;
        works: BibWork[];
      }[] = [];

      for (let i = 0; i < validPrograms.length; i++) {
        const prog = validPrograms[i];
        setProgress(`Buscando ${prog.name} (${i + 1}/${validPrograms.length})...`);

        let works: BibWork[];

        if (dataSource === "wos") {
          // WoS: use OG= (organization) + TS= (affiliation text) + year range
          const wosParams: WosSearchParams = {
            organization: selectedInst.display_name,
            topic: prog.affiliationSearch,
            yearStart,
            yearEnd,
            maxRecords: 2000,
            sortField: "TC+D",
          };
          works = (await fetchWosWorks(wosParams, (fetched, total) => {
            setProgress(`${prog.name}: ${fetched}/${total} registros...`);
          })) as BibWork[];
        } else {
          // OpenAlex
          const oaParams: OpenAlexSearchParams = {
            institutionId: selectedInst.id,
            rawAffiliation: prog.affiliationSearch,
            yearStart,
            yearEnd,
            maxRecords: 2000,
            sort: "cited_by_count:desc",
            apiKey: process.env.NEXT_PUBLIC_OPENALEX_API_KEY ?? "",
          };
          works = (await fetchOpenAlexWorks(oaParams, (fetched, total) => {
            setProgress(`${prog.name}: ${fetched}/${total} registros...`);
          })) as BibWork[];
        }

        programResults.push({
          id: prog.id,
          name: prog.name,
          affiliationSearch: prog.affiliationSearch,
          works,
        });
        allWorks.push(...works);
      }

      setProgress("Enriquecendo periódicos via Scopus...");
      const enrichResult = await enrichJournalMetrics(allWorks, (done, total) => {
        setProgress(`Scopus: ${done}/${total} periódicos...`);
      });

      const payload = {
        institution: {
          id: selectedInst.id,
          display_name: selectedInst.display_name,
          country_code: selectedInst.country_code,
        },
        dataSource,
        yearStart,
        yearEnd,
        programs: programResults.map((pr) => ({
          id: pr.id,
          name: pr.name,
          affiliationSearch: pr.affiliationSearch,
          worksCount: pr.works.length,
        })),
        programWorks: programResults.map((pr) => ({
          id: pr.id,
          works: pr.works,
        })),
        journalMetrics: Array.from(enrichResult.journalMetrics.entries()),
        enrichmentStats: {
          enrichedCount: enrichResult.enrichedCount,
          notFoundCount: enrichResult.notFoundCount,
          totalIssns: enrichResult.totalIssns,
        },
      };

      sessionStorage.setItem("programas-data", JSON.stringify(payload));
      toast.success(`Busca concluída! ${allWorks.length} registros de ${validPrograms.length} programas.`);
      router.push("/programas/resultados");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro na busca.";
      toast.error(msg);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [selectedInst, programs, yearStart, yearEnd, dataSource, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="size-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">BibAnalize</h1>
              <p className="text-xs text-muted-foreground">Programas de Pós-Graduação</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            Início
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GraduationCap className="size-8 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight">Comparação de Programas</h2>
          </div>
          <p className="text-muted-foreground">
            Compare a produção bibliométrica e classificação Qualis de programas de pós-graduação dentro de uma instituição.
          </p>
        </div>

        <div className="space-y-6">
          {/* Data Source Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="size-4" />
                Fonte de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={dataSource} onValueChange={(v) => setDataSource(v as DataSource)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="openalex" className="gap-2">
                    <BookOpen className="size-4" />
                    OpenAlex
                  </TabsTrigger>
                  <TabsTrigger value="wos" className="gap-2">
                    <Globe className="size-4" />
                    Web of Science
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground mt-2">
                {dataSource === "openalex"
                  ? "OpenAlex: base aberta com >250M de trabalhos. Filtro por raw_affiliation_strings."
                  : "Web of Science: base premium Clarivate. Filtro por organização (OG) e tópico (TS)."}
              </p>
            </CardContent>
          </Card>

          {/* Institution Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                Instituição
              </CardTitle>
              <CardDescription>
                Busque e selecione a instituição (fonte: OpenAlex).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={instRef} className="relative">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Digite o nome da instituição..."
                    value={instQuery}
                    onChange={(e) => {
                      setInstQuery(e.target.value);
                      if (selectedInst) setSelectedInst(null);
                    }}
                    className="flex-1"
                  />
                  {instLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {selectedInst && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setSelectedInst(null);
                        setInstQuery("");
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>

                {showInstDropdown && instResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
                    {instResults.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => selectInstitution(inst)}
                      >
                        <div className="font-medium">{inst.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {inst.country_code} · {inst.type} · {inst.works_count.toLocaleString("pt-BR")} trabalhos
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedInst && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="gap-1.5">
                      <Building2 className="size-3" />
                      {selectedInst.display_name}
                      <span className="text-muted-foreground">({selectedInst.country_code})</span>
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Year Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Ano inicial</Label>
                  <Input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={yearStart}
                    onChange={(e) => setYearStart(Number(e.target.value) || 2020)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ano final</Label>
                  <Input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={yearEnd}
                    onChange={(e) => setYearEnd(Number(e.target.value) || new Date().getFullYear())}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Programs Definition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="size-5" />
                Programas ({programs.length}/{MAX_PROGRAMS})
              </CardTitle>
              <CardDescription>
                {selectedInst
                  ? dataSource === "openalex"
                    ? "Digite o nome do programa e selecione a afiliação sugerida pelo OpenAlex."
                    : "Digite o nome do programa e selecione a afiliação. A busca no WoS usará o texto como filtro de tópico (TS)."
                  : "Selecione uma instituição acima para buscar programas."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {programs.map((prog, idx) => (
                <div key={prog.id} className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Programa {idx + 1}
                    </span>
                    {programs.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => removeProgram(prog.id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div
                    ref={(el) => { affRefs.current[prog.id] = el; }}
                    className="relative"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={
                          selectedInst
                            ? "Digite ex: Computação, Engenharia, Matemática..."
                            : "Selecione uma instituição primeiro"
                        }
                        value={prog.query}
                        onChange={(e) => handleProgramQueryChange(prog.id, e.target.value)}
                        disabled={!selectedInst}
                        className="flex-1"
                      />
                      {affLoading[prog.id] && (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      )}
                      {prog.confirmed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => clearProgram(prog.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>

                    {showAffDropdown[prog.id] && (affResults[prog.id]?.length ?? 0) > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-auto">
                        {affResults[prog.id].map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                            onClick={() => selectAffiliation(prog.id, sug)}
                          >
                            <div className="line-clamp-2">{sug.text}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {sug.count} ocorrência{sug.count !== 1 ? "s" : ""}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {prog.confirmed && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <GraduationCap className="size-3" />
                          {prog.name}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Nome de exibição (editável)</Label>
                        <Input
                          value={prog.name}
                          onChange={(e) =>
                            setPrograms((prev) =>
                              prev.map((p) => (p.id === prog.id ? { ...p, name: e.target.value } : p)),
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {programs.length < MAX_PROGRAMS && (
                <Button variant="outline" className="w-full gap-2" onClick={addProgram} disabled={!selectedInst}>
                  <Plus className="size-4" />
                  Adicionar Programa
                </Button>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Submit */}
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={loading || !selectedInst || programs.filter((p) => p.confirmed).length < 2}
            onClick={handleSearch}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {progress ?? "Processando..."}
              </>
            ) : (
              <>
                <Search className="size-4" />
                Buscar e Comparar Programas
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

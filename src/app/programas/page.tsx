"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fetchOpenAlexWorks,
  searchInstitutions,
  type OpenAlexInstitution,
  type OpenAlexSearchParams,
} from "@/lib/openalex-api";
import { fetchWosWorks, type WosSearchParams } from "@/lib/wos-api";
import { enrichJournalMetrics } from "@/lib/scopus-enrich";
import type { BibWork } from "@/types/bibliometric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  FileText,
  Globe,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

type DataSource = "openalex" | "wos";
type ProgramSearchMode = "affiliation" | "authorIds";

interface ProgramEntry {
  id: string;
  name: string;
  affiliationSearch: string;
  searchMode: ProgramSearchMode;
  authorIds: string;
}

const MAX_PROGRAMS = 4;

function generateId() {
  return `prog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Parse a free-text string of author IDs into a deduplicated array. */
function parseAuthorIds(raw: string): string[] {
  return [...new Set(
    raw.split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean),
  )];
}

function createEmptyProgram(): ProgramEntry {
  return { id: generateId(), name: "", affiliationSearch: "", searchMode: "affiliation", authorIds: "" };
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
    createEmptyProgram(),
    createEmptyProgram(),
  ]);

  // Search config
  const [yearStart, setYearStart] = useState("1960");
  const [yearEnd, setYearEnd] = useState(String(new Date().getFullYear()));

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
        const results = await searchInstitutions(instQuery);
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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (instRef.current && !instRef.current.contains(e.target as Node)) {
        setShowInstDropdown(false);
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

  const addProgram = () => {
    if (programs.length >= MAX_PROGRAMS) return;
    setPrograms((prev) => [...prev, createEmptyProgram()]);
  };

  const removeProgram = (id: string) => {
    if (programs.length <= 2) return;
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProgram = <K extends keyof Omit<ProgramEntry, "id">>(id: string, field: K, value: ProgramEntry[K]) => {
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  // Derived: whether institution selection is required
  const needsInstitution = programs.some((p) => p.searchMode === "affiliation");

  const isProgramValid = (p: ProgramEntry) => {
    if (!p.name.trim()) return false;
    if (p.searchMode === "authorIds") return parseAuthorIds(p.authorIds).length > 0;
    return p.affiliationSearch.trim().length > 0;
  };

  const handleSearch = useCallback(async () => {
    const validPrograms = programs.filter(isProgramValid);
    const requiresInst = validPrograms.some((p) => p.searchMode === "affiliation");

    if (requiresInst && !selectedInst) {
      toast.warning("Selecione uma instituição para programas com busca por afiliação.");
      return;
    }

    if (validPrograms.length < 2) {
      toast.warning("Defina pelo menos 2 programas completos (nome + afiliação ou IDs).");
      return;
    }

    const ys = Number(yearStart) || 1960;
    const ye = Number(yearEnd) || new Date().getFullYear();

    setLoading(true);
    setProgress("Iniciando busca...");

    try {
      const allWorks: BibWork[] = [];
      const programResults: {
        id: string;
        name: string;
        affiliationSearch: string;
        searchMode: ProgramSearchMode;
        authorIds: string;
        works: BibWork[];
      }[] = [];

      for (let i = 0; i < validPrograms.length; i++) {
        const prog = validPrograms[i];
        setProgress(`Buscando ${prog.name} (${i + 1}/${validPrograms.length})...`);

        let works: BibWork[];
        const progressCb = (fetched: number, total: number) => {
          setProgress(`${prog.name}: ${fetched}/${total} registros...`);
        };

        if (prog.searchMode === "authorIds") {
          // Always uses OpenAlex for author-ID mode
          const oaParams: OpenAlexSearchParams = {
            authorIds: prog.authorIds,
            yearStart: ys,
            yearEnd: ye,
            ...(selectedInst ? { institutionId: selectedInst.id } : {}),
            maxRecords: 2000,
            sort: "cited_by_count:desc",
          };
          works = (await fetchOpenAlexWorks(oaParams, progressCb)) as BibWork[];
        } else if (dataSource === "wos") {
          const wosParams: WosSearchParams = {
            organization: selectedInst!.display_name,
            topic: prog.affiliationSearch,
            yearStart: ys,
            yearEnd: ye,
            maxRecords: 2000,
            sortField: "TC+D",
          };
          works = (await fetchWosWorks(wosParams, progressCb)) as BibWork[];
        } else {
          const oaParams: OpenAlexSearchParams = {
            institutionId: selectedInst!.id,
            rawAffiliation: prog.affiliationSearch,
            yearStart: ys,
            yearEnd: ye,
            maxRecords: 2000,
            sort: "cited_by_count:desc",
          };
          works = (await fetchOpenAlexWorks(oaParams, progressCb)) as BibWork[];
        }

        programResults.push({
          id: prog.id,
          name: prog.name,
          affiliationSearch: prog.affiliationSearch,
          searchMode: prog.searchMode,
          authorIds: prog.authorIds,
          works,
        });
        allWorks.push(...works);
      }

      setProgress("Enriquecendo periódicos via Scopus...");
      const enrichResult = await enrichJournalMetrics(allWorks, (done, total) => {
        setProgress(`Scopus: ${done}/${total} periódicos...`);
      });

      const payload = {
        institution: selectedInst
          ? {
              id: selectedInst.id,
              display_name: selectedInst.display_name,
              country_code: selectedInst.country_code,
            }
          : null,
        dataSource,
        yearStart: ys,
        yearEnd: ye,
        programs: programResults.map((pr) => ({
          id: pr.id,
          name: pr.name,
          affiliationSearch: pr.affiliationSearch,
          searchMode: pr.searchMode,
          authorIds: pr.authorIds,
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
                {!needsInstitution && (
                  <span className="block mt-1 text-xs text-muted-foreground/70 italic">
                    Opcional quando todos os programas usam IDs de professores.
                  </span>
                )}
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
                    onChange={(e) => setYearStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ano final</Label>
                  <Input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={yearEnd}
                    onChange={(e) => setYearEnd(e.target.value)}
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
                Defina os programas a comparar. Para cada programa, escolha buscar por texto de
                afiliação ou por IDs de professores (OpenAlex / ORCID).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {programs.map((prog, idx) => {
                const idCount = parseAuthorIds(prog.authorIds).length;

                return (
                  <div key={prog.id} className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    {/* Header */}
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

                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label>Nome do programa</Label>
                      <Input
                        placeholder="ex: PPGCA, PPGEB, PPGSE..."
                        value={prog.name}
                        onChange={(e) => updateProgram(prog.id, "name", e.target.value)}
                      />
                    </div>

                    {/* Search mode toggle */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Modo de busca</Label>
                      <Tabs
                        value={prog.searchMode}
                        onValueChange={(v) => updateProgram(prog.id, "searchMode", v as ProgramSearchMode)}
                      >
                        <TabsList className="h-8 w-full grid grid-cols-2">
                          <TabsTrigger value="affiliation" className="gap-1.5 text-xs h-7">
                            <FileText className="size-3" />
                            Afiliação
                          </TabsTrigger>
                          <TabsTrigger value="authorIds" className="gap-1.5 text-xs h-7">
                            <Users className="size-3" />
                            IDs de Professores
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {/* Conditional search field */}
                    {prog.searchMode === "affiliation" ? (
                      <div className="space-y-1.5">
                        <Label>Texto de afiliação</Label>
                        <Input
                          placeholder="ex: Computação Aplicada, Engenharia Biomédica..."
                          value={prog.affiliationSearch}
                          onChange={(e) => updateProgram(prog.id, "affiliationSearch", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Trecho que aparece na afiliação dos autores.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label>IDs dos Professores</Label>
                        <Textarea
                          rows={4}
                          className="font-mono text-sm"
                          placeholder={"Cole IDs OpenAlex (ex: A5023888391)\nou ORCIDs (ex: 0000-0001-2345-6789),\num por linha."}
                          value={prog.authorIds}
                          onChange={(e) => updateProgram(prog.id, "authorIds", e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={idCount > 0 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {idCount} {idCount === 1 ? "ID" : "IDs"} identificado{idCount !== 1 ? "s" : ""}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Separe por linha, vírgula ou ponto-e-vírgula.
                          </span>
                        </div>
                        {dataSource === "wos" && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                            ⚠ Web of Science não suporta busca por ID. Será usado OpenAlex para este programa.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {programs.length < MAX_PROGRAMS && (
                <Button variant="outline" className="w-full gap-2" onClick={addProgram}>
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
            disabled={
              loading ||
              (needsInstitution && !selectedInst) ||
              programs.filter(isProgramValid).length < 2
            }
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

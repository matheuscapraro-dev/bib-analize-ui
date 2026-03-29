"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBib } from "@/store/bibliometric-context";
import { processUpload } from "@/lib/parser";
import { fetchOpenAlexWorks, getOpenAlexCount, type OpenAlexSearchParams } from "@/lib/openalex-api";
import type { BibWork } from "@/types/bibliometric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, Upload, Search, FileText, Globe,
  Loader2, AlertCircle, BookOpen, Bookmark,
} from "lucide-react";
import { SavedAnalysesList } from "@/components/saved-analyses-list";

const SORT_OPTIONS = [
  { value: "relevance_score:desc", label: "Relevância" },
  { value: "cited_by_count:desc", label: "Mais citados" },
  { value: "publication_date:desc", label: "Mais recentes" },
  { value: "publication_date:asc", label: "Mais antigos" },
];

const DOC_TYPE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "article", label: "Artigo" },
  { value: "review", label: "Revisão" },
  { value: "book-chapter", label: "Capítulo" },
  { value: "proceedings-article", label: "Conferência" },
  { value: "book", label: "Livro" },
  { value: "dataset", label: "Dataset" },
  { value: "dissertation", label: "Dissertação" },
];

export default function HomePage() {
  const router = useRouter();
  const { setData, setLoading, setError, loading } = useBib();

  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // OpenAlex state
  const [oaParams, setOaParams] = useState<OpenAlexSearchParams>({
    topic: "",
    author: "",
    source: "",
    institution: "",
    doi: "",
    yearStart: 2000,
    yearEnd: new Date().getFullYear(),
    docType: null,
    oaOnly: false,
    hasAbstract: false,
    sort: "relevance_score:desc",
    maxRecords: 1000,
    apiKey: "",
  });
  const [oaCount, setOaCount] = useState<number | null>(null);
  const [oaProgress, setOaProgress] = useState<{ fetched: number; total: number } | null>(null);

  // File upload handlers
  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) => f.name.endsWith(".txt") || f.name.endsWith(".csv") || f.name.endsWith(".tsv") || f.name.endsWith(".bib"),
    );
    if (!arr.length) {
      toast.error("Selecione arquivos válidos (.txt, .csv, .tsv)");
      return;
    }
    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    const totalSize = arr.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_SIZE) {
      toast.error(`Arquivos muito grandes (${(totalSize / 1024 / 1024).toFixed(1)} MB). Máximo: 50 MB.`);
      return;
    }
    setSelectedFiles(arr);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFiles.length) return;
    setLoading(true);
    try {
      const fileContents = await Promise.all(
        selectedFiles.map(async (f) => ({
          name: f.name,
          content: await f.text(),
        }))
      );
      const works = processUpload(fileContents);
      if (!works.length) {
        setError("Nenhum registro encontrado nos arquivos.");
        toast.error("Nenhum registro encontrado.");
        return;
      }
      setData(works as BibWork[], "upload", selectedFiles.map((f) => f.name).join(", "));
      toast.success(`${works.length} registros carregados.`);
      router.push("/analise");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar arquivos.";
      setError(msg);
      toast.error(msg);
    }
  }, [selectedFiles, setData, setLoading, setError, router]);

  // OpenAlex handlers
  const handleCheckCount = useCallback(async () => {
    if (!oaParams.topic && !oaParams.author && !oaParams.source && !oaParams.institution && !oaParams.doi) {
      toast.warning("Preencha pelo menos um campo de busca.");
      return;
    }
    try {
      const count = await getOpenAlexCount(oaParams);
      setOaCount(count);
    } catch {
      toast.error("Erro ao consultar OpenAlex.");
    }
  }, [oaParams]);

  const handleOaSearch = useCallback(async () => {
    if (!oaParams.topic && !oaParams.author && !oaParams.source && !oaParams.institution && !oaParams.doi) {
      toast.warning("Preencha pelo menos um campo de busca.");
      return;
    }
    setLoading(true);
    setOaProgress(null);
    try {
      const works = await fetchOpenAlexWorks(oaParams, (fetched, total) => {
        setOaProgress({ fetched, total });
      });
      if (!works.length) {
        setError("Nenhum resultado encontrado.");
        toast.error("Nenhum resultado encontrado.");
        return;
      }
      setData(works as BibWork[], "openalex", `OpenAlex: ${oaParams.topic ?? ""}`, oaParams as unknown as Record<string, unknown>);
      toast.success(`${works.length} registros obtidos do OpenAlex.`);
      router.push("/analise");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro na busca.";
      setError(msg);
      toast.error(msg);
    }
  }, [oaParams, setData, setLoading, setError, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="size-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">BibAnalize</h1>
              <p className="text-xs text-muted-foreground">Análise Bibliométrica</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            v2.0
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Análise Bibliométrica</h2>
          <p className="text-muted-foreground">
            Carregue arquivos Web of Science ou busque diretamente no OpenAlex para iniciar a análise.
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="size-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="openalex" className="gap-2">
              <Globe className="size-4" />
              OpenAlex
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="size-4" />
              Salvos
            </TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5" />
                  Upload de Arquivos Web of Science
                </CardTitle>
                <CardDescription>
                  Suporta formato Tagged (campo-valor) e Tab-delimited. Múltiplos arquivos são consolidados automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true;
                    input.accept = ".txt,.csv,.tsv,.bib";
                    input.onchange = () => {
                      if (input.files?.length) handleFiles(input.files);
                    };
                    input.click();
                  }}
                >
                  <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Arraste os arquivos aqui ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-1">.txt, .csv, .tsv (formato Web of Science)</p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{selectedFiles.length} arquivo(s) selecionado(s):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFiles.map((f) => (
                        <Badge key={f.name} variant="secondary" className="gap-1">
                          <FileText className="size-3" />
                          {f.name}
                        </Badge>
                      ))}
                    </div>
                    <Button onClick={handleUpload} disabled={loading} className="w-full mt-3">
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      {loading ? "Processando..." : "Processar Arquivos"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* OpenAlex Tab */}
          <TabsContent value="openalex">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="size-5" />
                  Busca na API OpenAlex
                </CardTitle>
                <CardDescription>
                  Acesse milhões de publicações acadêmicas. Todos os campos são opcionais e combinados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Tópico / Palavras-chave</Label>
                    <Input
                      placeholder='ex: "machine learning" AND healthcare'
                      value={oaParams.topic ?? ""}
                      onChange={(e) => setOaParams((p) => ({ ...p, topic: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Autor</Label>
                    <Input
                      placeholder="ex: João Silva"
                      value={oaParams.author ?? ""}
                      onChange={(e) => setOaParams((p) => ({ ...p, author: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Periódico / Fonte</Label>
                    <Input
                      placeholder="ex: Nature"
                      value={oaParams.source ?? ""}
                      onChange={(e) => setOaParams((p) => ({ ...p, source: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Instituição</Label>
                    <Input
                      placeholder="ex: University of São Paulo"
                      value={oaParams.institution ?? ""}
                      onChange={(e) => setOaParams((p) => ({ ...p, institution: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>DOI</Label>
                    <Input
                      placeholder="ex: 10.1000/xyz123"
                      value={oaParams.doi ?? ""}
                      onChange={(e) => setOaParams((p) => ({ ...p, doi: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Ano início</Label>
                    <Input
                      type="number"
                      min={1800}
                      max={new Date().getFullYear()}
                      value={oaParams.yearStart ?? ""}
                      onChange={(e) => setOaParams((p) => ({ ...p, yearStart: Number(e.target.value) || undefined }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ano fim</Label>
                    <Input
                      type="number"
                      min={1800}
                      max={new Date().getFullYear()}
                      value={oaParams.yearEnd ?? ""}
                      onChange={(e) => setOaParams((p) => ({ ...p, yearEnd: Number(e.target.value) || undefined }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select
                      value={oaParams.docType ?? ""}
                      onValueChange={(v) => setOaParams((p) => ({ ...p, docType: v || null }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value || "all"}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ordenar</Label>
                    <Select
                      value={oaParams.sort}
                      onValueChange={(v) => setOaParams((p) => ({ ...p, sort: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="space-y-1.5 w-32">
                    <Label>Máx. registros</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={oaParams.maxRecords}
                      onChange={(e) => setOaParams((p) => ({ ...p, maxRecords: Number(e.target.value) || 1000 }))}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={oaParams.oaOnly}
                      onCheckedChange={(v) => setOaParams((p) => ({ ...p, oaOnly: !!v }))}
                    />
                    Apenas Open Access
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={oaParams.hasAbstract}
                      onCheckedChange={(v) => setOaParams((p) => ({ ...p, hasAbstract: !!v }))}
                    />
                    Apenas com abstract
                  </label>
                </div>

                <div className="space-y-1.5">
                  <Label>API Key (opcional)</Label>
                  <Input
                    type="password"
                    placeholder="Polite pool por padrão"
                    value={oaParams.apiKey ?? ""}
                    onChange={(e) => setOaParams((p) => ({ ...p, apiKey: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCheckCount} disabled={loading}>
                    <Search className="size-4" />
                    Verificar quantidade
                  </Button>
                  <Button onClick={handleOaSearch} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    {loading ? (oaProgress ? `Buscando ${oaProgress.fetched}/${oaProgress.total}...` : "Buscando...") : "Buscar e Analisar"}
                  </Button>
                </div>

                {oaCount !== null && !loading && (
                  <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-muted">
                    <AlertCircle className="size-4 text-muted-foreground" />
                    <span>
                      <strong>{oaCount.toLocaleString("pt-BR")}</strong> trabalhos encontrados.
                      {oaCount > (oaParams.maxRecords ?? 1000) && (
                        <span className="text-muted-foreground"> Serão baixados os primeiros {oaParams.maxRecords?.toLocaleString("pt-BR")}.</span>
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Saved Analyses Tab */}
          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark className="size-5" />
                  Análises Salvas
                </CardTitle>
                <CardDescription>
                  Acesse análises anteriores salvas no navegador. Clique em uma para carregar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SavedAnalysesList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto text-center text-xs text-muted-foreground px-4">
          BibAnalize &mdash; Ferramenta de Análise Bibliométrica &bull; PPGCA/UTFPR
        </div>
      </footer>
    </div>
  );
}

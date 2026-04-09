"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Search, Plus, X, GitBranch, Network, TreePine,
  Loader2, RotateCcw, Info,
} from "lucide-react";
import { RefProvider, useRef_ } from "@/store/reference-context";
import { ReferenceNetwork } from "@/components/charts/reference-network";
import { ReferenceTree } from "@/components/charts/reference-tree";
import { ReferenceDetailPanel } from "@/components/reference-detail-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/empty-state";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";

function ReferenceExplorerContent() {
  const {
    seeds,
    nodes,
    edges,
    searchQuery,
    searchResults,
    searchLoading,
    maxRefsPerNode,
    selectedNodeId,
    exploring,
    search,
    addSeed,
    removeSeed,
    explore,
    expandNode,
    setMaxRefs,
    selectNode,
    reset,
  } = useRef_();

  const [inputValue, setInputValue] = useState("");
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const graphRef = useChartRef();
  const treeRef = useChartRef();

  // Debounced search
  const handleInputChange = useCallback(
    (val: string) => {
      setInputValue(val);
      clearTimeout(debounceRef.current);
      if (!val.trim()) {
        search("");
        setShowResults(false);
        return;
      }
      debounceRef.current = setTimeout(() => {
        search(val);
        setShowResults(true);
      }, 400);
    },
    [search],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddSeed = useCallback(
    (work: (typeof searchResults)[0]) => {
      addSeed(work);
      setInputValue("");
      search("");
      setShowResults(false);
    },
    [addSeed, search],
  );

  const handleNodeClick = useCallback(
    (id: string) => {
      selectNode(selectedNodeId === id ? null : id);
    },
    [selectNode, selectedNodeId],
  );

  const handleExpandFromPanel = useCallback(
    (id: string) => {
      expandNode(id);
    },
    [expandNode],
  );

  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) ?? null : null;
  const hasGraph = nodes.size > 0 && edges.length > 0;

  // KPIs
  const kpis = useMemo(() => {
    const nodeArr = Array.from(nodes.values());
    const sharedCount = edges.reduce((acc, e) => {
      const incoming = edges.filter((ed) => ed.target === e.target).length;
      return incoming > 1 ? acc + 1 : acc;
    }, 0);
    const uniqueShared = new Set(
      edges.filter((e) => edges.filter((ed) => ed.target === e.target).length > 1).map((e) => e.target),
    ).size;
    const maxLevel = nodeArr.reduce((m, n) => Math.max(m, n.level), 0);
    return {
      totalNodes: nodes.size,
      totalEdges: edges.length,
      maxLevel,
      sharedNodes: uniqueShared,
    };
  }, [nodes, edges]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2">
            <GitBranch className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Explorador de Referências</h1>
          </div>
          {nodes.size > 0 && (
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="size-3.5 mr-1.5" />
              Nova exploração
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Search + Seeds section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Artigos Semente</CardTitle>
            <p className="text-sm text-muted-foreground">
              Busque artigos por título, DOI ou autor para usar como ponto de partida da exploração de referências.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search box */}
            <div ref={searchBoxRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, DOI ou autor..."
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  className="pl-10"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg bg-popover shadow-lg max-h-80 overflow-auto">
                  {searchResults.map((work) => {
                    const id = String(work.UT ?? "");
                    const alreadyAdded = nodes.has(id);
                    return (
                      <div
                        key={id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">
                            {String(work.TI ?? "Sem título")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {String(work.AU ?? "").split(";").slice(0, 3).join("; ")}
                            {(String(work.AU ?? "").split(";").length > 3) ? " et al." : ""}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {work.PY ? (
                              <span className="text-xs text-muted-foreground">{work.PY}</span>
                            ) : null}
                            {work.SO ? (
                              <span className="text-xs text-muted-foreground truncate max-w-40">
                                {work.SO}
                              </span>
                            ) : null}
                            {work.TC != null && (
                              <span className="text-xs text-muted-foreground">{work.TC} cit.</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant={alreadyAdded ? "secondary" : "outline"}
                          size="sm"
                          disabled={alreadyAdded}
                          onClick={() => handleAddSeed(work)}
                          className="shrink-0"
                        >
                          {alreadyAdded ? "Adicionado" : <><Plus className="size-3.5 mr-1" />Adicionar</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Options row: max refs + explore button */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground whitespace-nowrap">
                  Máx. referências por nó:
                </label>
                <Select
                  value={String(maxRefsPerNode)}
                  onValueChange={(v) => setMaxRefs(Number(v))}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={explore}
                disabled={seeds.length === 0 || exploring}
                className="ml-auto"
              >
                {exploring ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Buscando referências...
                  </>
                ) : (
                  <>
                    <GitBranch className="size-4 mr-2" />
                    Explorar Referências
                  </>
                )}
              </Button>
            </div>

            {/* Seed chips */}
            {seeds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {seeds.map((id) => {
                  const node = nodes.get(id);
                  if (!node) return null;
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="max-w-72 gap-1 pl-2.5 pr-1 py-1"
                    >
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate text-xs">
                        {String(node.work.TI ?? "").slice(0, 50)}
                      </span>
                      <button
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={() => removeSeed(id)}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info box when no graph yet */}
        {!hasGraph && seeds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GitBranch className="size-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-medium mb-2">Explore redes de referências</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Busque artigos, adicione-os como sementes e clique em &ldquo;Explorar Referências&rdquo;
              para visualizar as referências e suas conexões em até 2 níveis de profundidade.
            </p>
          </div>
        )}

        {/* KPI cards */}
        {hasGraph && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total de Nós" value={kpis.totalNodes} />
            <KpiCard label="Conexões" value={kpis.totalEdges} />
            <KpiCard label="Profundidade máx." value={kpis.maxLevel} />
            <KpiCard label="Nós compartilhados" value={kpis.sharedNodes} />
          </div>
        )}

        {/* Visualization */}
        {hasGraph && (
          <Tabs defaultValue="graph" className="w-full">
            <TabsList>
              <TabsTrigger value="graph" className="gap-1.5">
                <Network className="size-3.5" />
                Grafo de Rede
              </TabsTrigger>
              <TabsTrigger value="tree" className="gap-1.5">
                <TreePine className="size-3.5" />
                Árvore Hierárquica
              </TabsTrigger>
            </TabsList>

            <TabsContent value="graph" className="mt-4">
              <ChartContainer
                ref={graphRef}
                title="Grafo de Referências"
                description="Click num nó para ver detalhes. Nós maiores = mais citações. Cor indica profundidade."
                actions={<ChartExportButton chartRef={graphRef} fileName="reference-network" />}
              >
                <ReferenceNetwork
                  nodes={nodes}
                  edges={edges}
                  height={600}
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedNodeId}
                />
              </ChartContainer>
            </TabsContent>

            <TabsContent value="tree" className="mt-4">
              <ChartContainer
                ref={treeRef}
                title="Árvore de Referências"
                description="Clique para expandir/colapsar. Setas indicam direção da referência."
                actions={<ChartExportButton chartRef={treeRef} fileName="reference-tree" />}
              >
                <ReferenceTree
                  nodes={nodes}
                  edges={edges}
                  seeds={seeds}
                  height={600}
                  onNodeClick={handleNodeClick}
                  onExpand={handleExpandFromPanel}
                  selectedNodeId={selectedNodeId}
                />
              </ChartContainer>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Detail panel */}
      <ReferenceDetailPanel
        node={selectedNode}
        open={!!selectedNode}
        onClose={() => selectNode(null)}
        onExpand={handleExpandFromPanel}
      />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ReferenciasPage() {
  return (
    <RefProvider>
      <ReferenceExplorerContent />
    </RefProvider>
  );
}

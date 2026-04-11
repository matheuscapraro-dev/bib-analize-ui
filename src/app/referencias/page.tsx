"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  GitBranch, Network, TreePine, Trophy,
  Loader2, RotateCcw, ArrowLeft,
} from "lucide-react";
import { RefProvider, useRef_ } from "@/store/reference-context";
import { ReferenceNetwork } from "@/components/charts/reference-network";
import { ReferenceTree } from "@/components/charts/reference-tree";
import { ReferenceDetailPanel } from "@/components/reference-detail-panel";
import { ReferenceImportance } from "@/components/charts/reference-importance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import type { BibWork } from "@/types/bibliometric";

function ReferenceExplorerContent() {
  const router = useRouter();
  const {
    seeds,
    nodes,
    edges,
    selectedNodeId,
    exploring,
    explore,
    expandNode,
    initSeeds,
    selectNode,
    reset,
  } = useRef_();

  const graphRef = useChartRef();
  const treeRef = useChartRef();
  const importanceRef = useChartRef();
  const [initialized, setInitialized] = useState(false);

  // Load seeds from sessionStorage on mount and auto-explore
  useEffect(() => {
    if (initialized) return;
    try {
      const raw = sessionStorage.getItem("ref-seeds");
      const maxRefs = Number(sessionStorage.getItem("ref-max-refs") || "15");
      if (!raw) {
        router.replace("/");
        return;
      }
      const seedWorks = JSON.parse(raw) as Partial<BibWork>[];
      if (!seedWorks.length) {
        router.replace("/");
        return;
      }
      sessionStorage.removeItem("ref-seeds");
      sessionStorage.removeItem("ref-max-refs");
      initSeeds(seedWorks, maxRefs);
      setInitialized(true);
    } catch {
      router.replace("/");
    }
  }, [initialized, initSeeds, router]);

  // Auto-explore once seeds are loaded
  useEffect(() => {
    if (initialized && seeds.length > 0 && edges.length === 0 && !exploring) {
      explore();
    }
  }, [initialized, seeds.length, edges.length, exploring, explore]);

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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="size-4" />
            </Button>
            <GitBranch className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Explorador de Referências</h1>
          </div>
          <div className="flex items-center gap-2">
            {seeds.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                {seeds.map((id) => {
                  const node = nodes.get(id);
                  if (!node) return null;
                  return (
                    <Badge key={id} variant="secondary" className="max-w-48 gap-1 text-xs">
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">{String(node.work.TI ?? "").slice(0, 30)}</span>
                    </Badge>
                  );
                })}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => { reset(); router.push("/"); }}>
              <RotateCcw className="size-3.5 mr-1.5" />
              Nova exploração
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Loading state */}
        {exploring && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="size-10 text-primary animate-spin mb-4" />
            <h2 className="text-lg font-medium mb-2">Buscando referências...</h2>
            <p className="text-sm text-muted-foreground">
              Expandindo referências das {seeds.length} {seeds.length === 1 ? "semente" : "sementes"} selecionadas.
            </p>
          </div>
        )}

        {/* KPI cards */}
        {hasGraph && !exploring && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total de Nós" value={kpis.totalNodes} />
            <KpiCard label="Conexões" value={kpis.totalEdges} />
            <KpiCard label="Profundidade máx." value={kpis.maxLevel} />
            <KpiCard label="Nós compartilhados" value={kpis.sharedNodes} />
          </div>
        )}

        {/* Visualization */}
        {hasGraph && !exploring && (
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
              <TabsTrigger value="importance" className="gap-1.5">
                <Trophy className="size-3.5" />
                Referências-Chave
              </TabsTrigger>
            </TabsList>

            <TabsContent value="graph" className="mt-4">
              <ChartContainer
                ref={graphRef}
                title="Grafo de Referências"
                description="Clique num nó para ver detalhes. Nós maiores = mais citações. Cor indica profundidade."
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

            <TabsContent value="importance" className="mt-4">
              <ChartContainer
                ref={importanceRef}
                title="Referências-Chave"
                description="Ranking das referências mais importantes com base em compartilhamento (in-degree) e citações globais."
                actions={<ChartExportButton chartRef={importanceRef} fileName="reference-importance" />}
              >
                <ReferenceImportance
                  nodes={nodes}
                  edges={edges}
                  onNodeClick={handleNodeClick}
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

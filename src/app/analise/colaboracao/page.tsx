"use client";

import { useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { coauthorshipNetwork, countryCollaborationNetwork, institutionCollaborationNetwork, keywordCooccurrenceNetwork } from "@/lib/data-processing";
import { NetworkGraph } from "@/components/charts/network-graph";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, MapPin, Hash, Network } from "lucide-react";
import type { NetworkData } from "@/types/bibliometric";

function NetworkMetrics({ data, label }: { data: NetworkData; label: string }) {
  const topDegree = useMemo(() =>
    [...data.nodes]
      .sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0))
      .slice(0, 10),
    [data.nodes],
  );
  const topBetweenness = useMemo(() =>
    [...data.nodes]
      .filter((n) => (n.degreeCentrality ?? 0) > 0)
      .sort((a, b) => (b.degreeCentrality ?? 0) - (a.degreeCentrality ?? 0))
      .slice(0, 10),
    [data.nodes],
  );
  const communities = useMemo(() => {
    const set = new Set(data.nodes.map((n) => n.community));
    return set.size;
  }, [data.nodes]);

  if (!data.nodes.length) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Network className="size-3.5" /> Métricas da Rede
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><span className="text-muted-foreground">Nós:</span> {data.nodes.length}</p>
          <p><span className="text-muted-foreground">Arestas:</span> {data.edges.length}</p>
          <p><span className="text-muted-foreground">Comunidades:</span> {communities}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 10 — Grau (conexões)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-1">
            {topDegree.map((n, i) => (
              <div key={n.id} className="flex justify-between">
                <span className="truncate max-w-[180px]">{i + 1}. {n.label}</span>
                <span className="text-muted-foreground font-mono">{n.degree ?? 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 10 — Centralidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-1">
            {topBetweenness.map((n, i) => (
              <div key={n.id} className="flex justify-between">
                <span className="truncate max-w-[180px]">{i + 1}. {n.label}</span>
                <span className="text-muted-foreground font-mono">{(n.degreeCentrality ?? 0).toFixed(3)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ColaboracaoPage() {
  const { filtered } = useBib();
  const coauthRef = useChartRef();
  const instRef = useChartRef();
  const countryRef = useChartRef();
  const kwRef = useChartRef();

  const coauthNet = useMemo(() => coauthorshipNetwork(filtered, 50), [filtered]);
  const instNet = useMemo(() => institutionCollaborationNetwork(filtered, 40), [filtered]);
  const countryNet = useMemo(() => countryCollaborationNetwork(filtered, 30), [filtered]);
  const kwNet = useMemo(() => keywordCooccurrenceNetwork(filtered, "DE", 5, 40), [filtered]);

  const avgAuthorsPerDoc = useMemo(() => {
    const counts = filtered.map(w => (w.AU ?? "").split(";").filter(Boolean).length);
    return counts.length ? (counts.reduce((a, b) => a + b, 0) / counts.length) : 0;
  }, [filtered]);

  const intlCollab = useMemo(() => {
    let count = 0;
    for (const w of filtered) {
      const c1 = w.C1 ?? "";
      const countries = new Set<string>();
      for (const part of c1.split(";")) {
        const trimmed = part.trim();
        if (trimmed) {
          const last = trimmed.split(",").pop()?.trim();
          if (last) countries.add(last);
        }
      }
      if (countries.size > 1) count++;
    }
    return count;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader title="Colaboração" description="Redes de colaboração entre autores, instituições e países" />

      <KpiGrid>
        <KpiCard title="Média Autores/Doc" value={avgAuthorsPerDoc.toFixed(1)} icon={<Users className="size-5" />} />
        <KpiCard title="Colab. Internacional" value={intlCollab} description={`${((intlCollab / filtered.length) * 100).toFixed(1)}% dos docs`} icon={<MapPin className="size-5" />} />
      </KpiGrid>

      <Tabs defaultValue="coauthor">
        <TabsList>
          <TabsTrigger value="coauthor" className="gap-1"><Users className="size-3.5" />Coautoria</TabsTrigger>
          <TabsTrigger value="institution" className="gap-1"><Building2 className="size-3.5" />Instituições</TabsTrigger>
          <TabsTrigger value="country" className="gap-1"><MapPin className="size-3.5" />Países</TabsTrigger>
          <TabsTrigger value="keyword" className="gap-1"><Hash className="size-3.5" />Palavras-chave</TabsTrigger>
        </TabsList>
        <TabsContent value="coauthor" className="space-y-0">
          <ChartContainer ref={coauthRef} title="Rede de Coautoria" actions={<ChartExportButton chartRef={coauthRef} fileName="rede-coautoria" />}>
            {coauthNet.nodes.length > 0 ? <NetworkGraph data={coauthNet} height={550} /> : <EmptyState />}
          </ChartContainer>
          <NetworkMetrics data={coauthNet} label="Autor" />
        </TabsContent>
        <TabsContent value="institution" className="space-y-0">
          <ChartContainer ref={instRef} title="Rede de Colaboração Institucional" actions={<ChartExportButton chartRef={instRef} fileName="rede-instituicoes" />}>
            {instNet.nodes.length > 0 ? <NetworkGraph data={instNet} height={550} /> : <EmptyState />}
          </ChartContainer>
          <NetworkMetrics data={instNet} label="Instituição" />
        </TabsContent>
        <TabsContent value="country" className="space-y-0">
          <ChartContainer ref={countryRef} title="Rede de Colaboração entre Países" actions={<ChartExportButton chartRef={countryRef} fileName="rede-paises" />}>
            {countryNet.nodes.length > 0 ? <NetworkGraph data={countryNet} height={550} /> : <EmptyState />}
          </ChartContainer>
          <NetworkMetrics data={countryNet} label="País" />
        </TabsContent>
        <TabsContent value="keyword" className="space-y-0">
          <ChartContainer ref={kwRef} title="Rede de Coocorrência de Palavras-chave" actions={<ChartExportButton chartRef={kwRef} fileName="rede-keywords" />}>
            {kwNet.nodes.length > 0 ? <NetworkGraph data={kwNet} height={550} /> : <EmptyState />}
          </ChartContainer>
          <NetworkMetrics data={kwNet} label="Palavra-chave" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useComparison } from "@/store/comparison-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { OverlapDisplay } from "@/components/comparison/overlap-display";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  computeSourceOverlap,
  computeTopSourcesComparison,
  computeBradfordComparison,
} from "@/lib/comparison/analyses";

export default function FontesComparativasPage() {
  const { datasets, isReady } = useComparison();
  const [topN, setTopN] = useState(20);

  const overlap = useMemo(
    () => (isReady ? computeSourceOverlap(datasets) : null),
    [datasets, isReady],
  );

  const topSources = useMemo(
    () => (isReady ? computeTopSourcesComparison(datasets, topN) : []),
    [datasets, isReady, topN],
  );

  const bradford = useMemo(
    () => (isReady ? computeBradfordComparison(datasets) : []),
    [datasets, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Fontes" description="Compare periódicos e fontes entre datasets." />
        <EmptyState message="Selecione pelo menos 2 datasets na Visão Geral." icon={<Newspaper className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fontes" description="Sobreposição de periódicos, ranking comparativo e zonas de Bradford." />

      <Tabs defaultValue="overlap">
        <TabsList>
          <TabsTrigger value="overlap">Sobreposição</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="bradford">Bradford</TabsTrigger>
        </TabsList>

        <TabsContent value="overlap" className="mt-4">
          {overlap && (
            <ChartContainer title="Sobreposição de Fontes" description="Periódicos compartilhados e exclusivos entre os datasets.">
              <OverlapDisplay result={overlap} datasets={datasets} label="fontes" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} />
          </div>
          <ChartContainer title={`Top ${topN} Fontes`} description="Periódicos com mais publicações em cada dataset.">
            <ComparisonBarChart
              data={topSources}
              categoryKey="name"
              datasets={datasets}
              height={Math.max(400, topN * 28)}
              layout="vertical"
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="bradford" className="mt-4">
          <ChartContainer title="Zonas de Bradford" description="Distribuição de periódicos pelas 3 zonas de Bradford (Núcleo, Intermediário, Periferia).">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bradford.map((b) => (
                <Card key={b.datasetId}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: b.color }} />
                      <p className="text-sm font-medium truncate">{b.datasetName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatNumber(b.bradford.totalJournals)} periódicos</p>
                    {b.bradford.zones.map((z, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Zona {i + 1}</span>
                        <span className="tabular-nums font-medium">
                          {z.sources} fontes &bull; {z.articles} art.
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}

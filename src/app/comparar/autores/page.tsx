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
import { Users } from "lucide-react";
import {
  computeAuthorOverlap,
  computeTopAuthorsComparison,
  computeCollaborationIntensity,
} from "@/lib/comparison/analyses";

export default function AutoresComparativosPage() {
  const { datasets, isReady } = useComparison();
  const [topN, setTopN] = useState(20);

  const overlap = useMemo(
    () => (isReady ? computeAuthorOverlap(datasets) : null),
    [datasets, isReady],
  );

  const topAuthors = useMemo(
    () => (isReady ? computeTopAuthorsComparison(datasets, topN) : []),
    [datasets, isReady, topN],
  );

  const collaboration = useMemo(
    () => (isReady ? computeCollaborationIntensity(datasets) : []),
    [datasets, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Autores" description="Compare autores entre datasets." />
        <EmptyState message="Selecione pelo menos 2 datasets na Visão Geral." icon={<Users className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Autores" description="Sobreposição de autores, ranking comparativo e métricas de colaboração." />

      <Tabs defaultValue="overlap">
        <TabsList>
          <TabsTrigger value="overlap">Sobreposição</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="collaboration">Colaboração</TabsTrigger>
        </TabsList>

        <TabsContent value="overlap" className="mt-4">
          {overlap && (
            <ChartContainer title="Sobreposição de Autores" description="Autores compartilhados e exclusivos entre os datasets.">
              <OverlapDisplay result={overlap} datasets={datasets} label="autores" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} />
          </div>
          <ChartContainer title={`Top ${topN} Autores`} description="Autores mais produtivos em cada dataset.">
            <ComparisonBarChart
              data={topAuthors}
              categoryKey="name"
              datasets={datasets}
              height={Math.max(400, topN * 28)}
              layout="vertical"
              labelMaxLen={30}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="collaboration" className="mt-4">
          <ChartContainer title="Intensidade de Colaboração" description="Métricas comparativas de colaboração entre datasets.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                    {datasets.map((ds) => (
                      <th key={ds.id} className="text-right py-2 px-3 font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="size-2 rounded-full" style={{ backgroundColor: ds.colorHex }} />
                          <span className="truncate max-w-[120px]">{ds.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {collaboration.map((row) => (
                    <tr key={row.metric} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.metric}</td>
                      {datasets.map((ds) => (
                        <td key={ds.id} className="text-right py-2.5 px-3 tabular-nums font-medium">
                          {typeof row[ds.id] === "number"
                            ? (row[ds.id] as number).toFixed(1)
                            : row[ds.id]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}

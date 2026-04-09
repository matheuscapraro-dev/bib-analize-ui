"use client";

import { useMemo, useState } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { OverlapDisplay } from "@/components/comparison/overlap-display";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "lucide-react";
import {
  computeAuthorOverlap,
  computeTopAuthorsComparison,
  computeCollaborationIntensity,
} from "@/lib/comparison/analyses";

export default function ProgramasAutoresPage() {
  const { programs, isReady } = usePrograms();
  const [topN, setTopN] = useState(20);
  const allWorks = useMemo(() => programs.flatMap((p) => p.works), [programs]);
  const { handleDrill, drillDownProps } = useArticleDrillDown(allWorks, "AU");

  const overlap = useMemo(
    () => (isReady ? computeAuthorOverlap(programs) : null),
    [programs, isReady],
  );

  const topAuthors = useMemo(
    () => (isReady ? computeTopAuthorsComparison(programs, topN) : []),
    [programs, isReady, topN],
  );

  const collaboration = useMemo(
    () => (isReady ? computeCollaborationIntensity(programs) : []),
    [programs, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Autores" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<Users className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Autores" description="Sobreposição de autores, ranking comparativo e métricas de colaboração." badge="Programas" />

      <Tabs defaultValue="overlap">
        <TabsList>
          <TabsTrigger value="overlap">Sobreposição</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="collaboration">Colaboração</TabsTrigger>
        </TabsList>

        <TabsContent value="overlap" className="mt-4">
          {overlap && (
            <ChartContainer title="Sobreposição de Autores" description="Autores compartilhados e exclusivos entre os programas.">
              <OverlapDisplay result={overlap} datasets={programs} label="autores" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} />
          </div>
          <ChartContainer title={`Top ${topN} Autores`} description="Autores mais produtivos em cada programa.">
            <ComparisonBarChart
              data={topAuthors}
              categoryKey="name"
              datasets={programs}
              height={Math.max(400, topN * 28)}
              layout="vertical"
              labelMaxLen={30}
              onBarClick={(e) => handleDrill(String(e.name))}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="collaboration" className="mt-4">
          <ChartContainer title="Intensidade de Colaboração" description="Métricas comparativas de colaboração entre programas.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                    {programs.map((ds) => (
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
                      {programs.map((ds) => (
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

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useComparison } from "@/store/comparison-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { BoxPlotComparison } from "@/components/charts/box-plot-comparison";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  computeCitationBoxPlots,
  computeFwciBoxPlots,
  computeTopCitedComparison,
  computePercentileComparison,
} from "@/lib/comparison/analyses";

export default function ImpactoComparativoPage() {
  const { datasets, isReady } = useComparison();

  const citBoxPlots = useMemo(
    () => (isReady ? computeCitationBoxPlots(datasets) : []),
    [datasets, isReady],
  );

  const fwciBoxPlots = useMemo(
    () => (isReady ? computeFwciBoxPlots(datasets) : []),
    [datasets, isReady],
  );

  const topCited = useMemo(
    () => (isReady ? computeTopCitedComparison(datasets) : []),
    [datasets, isReady],
  );

  const percentiles = useMemo(
    () => (isReady ? computePercentileComparison(datasets) : []),
    [datasets, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Impacto" description="Compare métricas de impacto entre datasets." />
        <EmptyState message="Selecione pelo menos 2 datasets na Visão Geral." icon={<TrendingUp className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Impacto" description="Distribuição de citações, FWCI, artigos mais citados e percentis." />

      <Tabs defaultValue="citations">
        <TabsList>
          <TabsTrigger value="citations">Citações</TabsTrigger>
          <TabsTrigger value="fwci">FWCI</TabsTrigger>
          <TabsTrigger value="topcited">Mais Citados</TabsTrigger>
          <TabsTrigger value="percentiles">Percentis</TabsTrigger>
        </TabsList>

        <TabsContent value="citations" className="mt-4">
          <ChartContainer title="Distribuição de Citações" description="Box plot comparando a distribuição de citações por documento.">
            <BoxPlotComparison data={citBoxPlots} valueLabel="Citações por documento" />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="fwci" className="mt-4">
          <ChartContainer title="Distribuição de FWCI" description="Field-Weighted Citation Impact — disponível apenas para dados do OpenAlex.">
            {fwciBoxPlots.some((b) => b.max > 0) ? (
              <BoxPlotComparison data={fwciBoxPlots} valueLabel="FWCI" />
            ) : (
              <EmptyState message="Dados de FWCI indisponíveis para os datasets selecionados." />
            )}
          </ChartContainer>
        </TabsContent>

        <TabsContent value="topcited" className="mt-4">
          <ChartContainer title="Top 10 Artigos Mais Citados" description="Artigos com maior número de citações em cada dataset.">
            <div className="grid gap-4 lg:grid-cols-2">
              {topCited.map((tc) => (
                <Card key={tc.datasetId}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="size-3 rounded-full" style={{ backgroundColor: tc.color }} />
                      <p className="text-sm font-medium truncate">{tc.datasetName}</p>
                    </div>
                    <div className="space-y-2">
                      {tc.articles.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground tabular-nums shrink-0 w-5 text-right">{i + 1}.</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium line-clamp-2">{a.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                              <span>{a.year}</span>
                              <Badge variant="outline" className="text-[10px] py-0">
                                {formatNumber(a.citations)} cit.
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ChartContainer>
        </TabsContent>

        <TabsContent value="percentiles" className="mt-4">
          <ChartContainer title="Métricas de Percentil" description="Proporção de artigos em faixas de alto impacto.">
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
                  {percentiles.map((row) => (
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

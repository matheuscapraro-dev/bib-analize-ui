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
import { Globe } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  computeCountryOverlap,
  computeTopCountriesComparison,
  computeInstitutionOverlap,
  computeGlobalSouthComparison,
} from "@/lib/comparison/analyses";

export default function GeograficoComparativoPage() {
  const { datasets, isReady } = useComparison();
  const [topN, setTopN] = useState(20);

  const countryOverlap = useMemo(
    () => (isReady ? computeCountryOverlap(datasets) : null),
    [datasets, isReady],
  );

  const topCountries = useMemo(
    () => (isReady ? computeTopCountriesComparison(datasets, topN) : []),
    [datasets, isReady, topN],
  );

  const instOverlap = useMemo(
    () => (isReady ? computeInstitutionOverlap(datasets) : null),
    [datasets, isReady],
  );

  const globalSouth = useMemo(
    () => (isReady ? computeGlobalSouthComparison(datasets) : []),
    [datasets, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Geográfico" description="Compare distribuição geográfica entre datasets." />
        <EmptyState message="Selecione pelo menos 2 datasets na Visão Geral." icon={<Globe className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Geográfico" description="Países, instituições e distribuição geográfica comparativa." />

      <Tabs defaultValue="countries">
        <TabsList>
          <TabsTrigger value="countries">Países</TabsTrigger>
          <TabsTrigger value="ranking">Top Países</TabsTrigger>
          <TabsTrigger value="institutions">Instituições</TabsTrigger>
          <TabsTrigger value="globalsouth">Sul Global</TabsTrigger>
        </TabsList>

        <TabsContent value="countries" className="mt-4">
          {countryOverlap && (
            <ChartContainer title="Sobreposição de Países" description="Países representados em comum e exclusivos.">
              <OverlapDisplay result={countryOverlap} datasets={datasets} label="países" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} />
          </div>
          <ChartContainer title={`Top ${topN} Países`} description="Países com mais publicações em cada dataset.">
            <ComparisonBarChart
              data={topCountries}
              categoryKey="name"
              datasets={datasets}
              height={Math.max(400, topN * 28)}
              layout="vertical"
              labelMaxLen={30}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="institutions" className="mt-4">
          {instOverlap && (
            <ChartContainer title="Sobreposição de Instituições" description="Instituições compartilhadas e exclusivas.">
              <OverlapDisplay result={instOverlap} datasets={datasets} label="instituições" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="globalsouth" className="mt-4">
          <ChartContainer title="Sul Global" description="Percentual de publicações com participação do Sul Global.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {globalSouth.map((gs) => (
                <Card key={gs.datasetId}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: gs.color }} />
                      <p className="text-sm font-medium truncate">{gs.datasetName}</p>
                    </div>
                    <p className="text-3xl font-bold tabular-nums">{gs.pct}%</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(gs.count)} de {formatNumber(gs.total)} publicações
                    </p>
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

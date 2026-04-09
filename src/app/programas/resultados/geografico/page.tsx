"use client";

import { useCallback, useMemo, useState } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { OverlapDisplay } from "@/components/comparison/overlap-display";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useProgramDrillDown } from "@/hooks/use-drill-down";
import { extractCountries } from "@/lib/data-processing";
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

export default function ProgramasGeograficoPage() {
  const { programs, isReady } = usePrograms();
  const [topN, setTopN] = useState(20);
  const countryFilter = useCallback(
    (data: import("@/types/bibliometric").BibWork[], value: string) => {
      const entries = extractCountries(data);
      const indices = new Set(entries.filter((e) => e.país === value).map((e) => e.index));
      return data.filter((_, i) => indices.has(i));
    },
    [],
  );
  const { handleDrill, drillDownProps } = useProgramDrillDown(programs, countryFilter);

  const countryOverlap = useMemo(
    () => (isReady ? computeCountryOverlap(programs) : null),
    [programs, isReady],
  );

  const topCountries = useMemo(
    () => (isReady ? computeTopCountriesComparison(programs, topN) : []),
    [programs, isReady, topN],
  );

  const instOverlap = useMemo(
    () => (isReady ? computeInstitutionOverlap(programs) : null),
    [programs, isReady],
  );

  const globalSouth = useMemo(
    () => (isReady ? computeGlobalSouthComparison(programs) : []),
    [programs, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Geográfico" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<Globe className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Geográfico" description="Países, instituições e distribuição geográfica comparativa." badge="Programas" />

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
              <OverlapDisplay result={countryOverlap} datasets={programs} label="países" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} />
          </div>
          <ChartContainer title={`Top ${topN} Países`} description="Países com mais publicações em cada programa.">
            <ComparisonBarChart
              data={topCountries}
              categoryKey="name"
              datasets={programs}
              height={Math.max(400, topN * 28)}
              layout="vertical"
              labelMaxLen={30}
              onBarClick={(e, dsId) => handleDrill(String(e.name), dsId)}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="institutions" className="mt-4">
          {instOverlap && (
            <ChartContainer title="Sobreposição de Instituições" description="Instituições compartilhadas e exclusivas.">
              <OverlapDisplay result={instOverlap} datasets={programs} label="instituições" />
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

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

"use client";

import { useCallback, useMemo } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { OverlayLineChart } from "@/components/charts/overlay-line-chart";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { EmptyState } from "@/components/empty-state";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useProgramDrillDown } from "@/hooks/use-drill-down";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart3, LineChart as LineIcon, TrendingUp, Hash } from "lucide-react";
import { pctDelta } from "@/lib/comparison/utils";
import type { BibWork } from "@/types/bibliometric";
import {
  computeHIndexComparison,
  computeCitationDistributionComparison,
  computeTotalCitationsTimeline,
  computeCitationTimeline,
} from "@/lib/comparison/analyses";

export default function ProgramasCitacoesPage() {
  const { programs, isReady } = usePrograms();

  const citFilter = useCallback(
    (data: BibWork[], value: string) => {
      // value is the bin label like "0", "1", "2–4", "5–9", "10–19", "50+"
      const match = value.match(/^(\d+)(?:[–+](\d*))?$/);
      if (!match) return data;
      const lo = parseInt(match[1], 10);
      const hi = value.includes("+") ? Infinity : match[2] ? parseInt(match[2], 10) : lo;
      return data.filter((w) => {
        const c = typeof w.Z9 === "number" ? w.Z9 : typeof w.TC === "number" ? w.TC : 0;
        return c >= lo && c <= hi;
      });
    },
    [],
  );

  const { handleDrill, drillDownProps } = useProgramDrillDown(programs, citFilter);

  const yearFilter = useCallback(
    (data: BibWork[], value: string) =>
      data.filter((w) => String(w.PY) === value),
    [],
  );
  const { handleDrill: handleYearDrill, drillDownProps: yearDrillProps } = useProgramDrillDown(programs, yearFilter);

  const hIndex = useMemo(
    () => (isReady ? computeHIndexComparison(programs) : []),
    [programs, isReady],
  );

  const distribution = useMemo(
    () => (isReady ? computeCitationDistributionComparison(programs) : []),
    [programs, isReady],
  );

  const totalCitTimeline = useMemo(
    () => (isReady ? computeTotalCitationsTimeline(programs) : []),
    [programs, isReady],
  );

  const avgCitTimeline = useMemo(
    () => (isReady ? computeCitationTimeline(programs) : []),
    [programs, isReady],
  );

  const onDotClick = useCallback(
    (e: Record<string, unknown>, dsId: string) => handleYearDrill(String(e.year), dsId),
    [handleYearDrill],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Citações" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<TrendingUp className="size-10" />} />
      </div>
    );
  }

  // Determine which drillDownProps to show (the one that's open)
  const activeDrill = drillDownProps.open ? drillDownProps : yearDrillProps;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citações & h-Index"
        description="Indicadores de impacto bibliométrico, distribuição de citações e evolução temporal."
        badge="Programas"
      />

      {/* h-Index & Citation Indicators */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="size-4" />
            Indicadores de Citação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                  {programs.map((p) => (
                    <th key={p.id} className="text-right py-2 px-3 font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: p.colorHex }} />
                        <span className="truncate max-w-[120px]">{p.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hIndex.map((row) => (
                  <tr key={row.metric} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 text-muted-foreground">{row.metric}</td>
                    {programs.map((p, i) => {
                      const val = row[p.id] as number;
                      const first = row[programs[0].id] as number;
                      const delta = i > 0 ? pctDelta(val, first) : null;
                      return (
                        <td key={p.id} className="text-right py-2.5 px-3 tabular-nums font-medium">
                          {typeof val === "number" && val % 1 !== 0 ? val.toFixed(1) : val}
                          {row.metric.includes("%") ? "%" : ""}
                          {delta !== null && delta !== 0 && (
                            <span className={`text-xs ml-1 ${delta > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {delta > 0 ? "+" : ""}{delta}%
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Tabs defaultValue="distribuicao">
        <TabsList>
          <TabsTrigger value="distribuicao" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Distribuição
          </TabsTrigger>
          <TabsTrigger value="total" className="gap-1.5">
            <LineIcon className="size-3.5" />
            Citações Totais/Ano
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-1.5">
            <TrendingUp className="size-3.5" />
            Média Citações/Ano
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribuicao" className="mt-4">
          <ChartContainer
            title="Distribuição de Citações"
            description="Quantidade de artigos por faixa de citações em cada programa."
          >
            <ComparisonBarChart
              data={distribution}
              categoryKey="category"
              datasets={programs}
              layout="horizontal"
              height={380}
              stacked={false}
              onBarClick={(e, dsId) => handleDrill(String(e.category), dsId)}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="total" className="mt-4">
          <ChartContainer
            title="Total de Citações por Ano"
            description="Soma de citações recebidas por publicações de cada ano."
          >
            <OverlayLineChart
              data={totalCitTimeline}
              xKey="year"
              datasets={programs}
              height={380}
              onDotClick={onDotClick}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <ChartContainer
            title="Média de Citações por Ano"
            description="Citações médias por documento publicado em cada ano."
          >
            <OverlayLineChart
              data={avgCitTimeline}
              xKey="year"
              datasets={programs}
              height={380}
              onDotClick={onDotClick}
            />
          </ChartContainer>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...activeDrill} />
    </div>
  );
}

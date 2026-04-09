"use client";

import { useCallback, useMemo, useState } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { TopNSelector } from "@/components/top-n-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { getWorkJournalMetrics } from "@/lib/scopus-enrich";
import { formatNumber } from "@/lib/utils";
import { pctDelta } from "@/lib/comparison/utils";
import { QUALIS_CLASSES, QUALIS_WEIGHTS } from "@/lib/constants";
import type { BibWork } from "@/types/bibliometric";
import {
  computeQualisComparison,
  computeQualisDistribution,
  computeQualisJournalDetails,
} from "@/lib/comparison/analyses";
import { Award, BarChart3, BookOpen, Table2 } from "lucide-react";

export default function QualisPage() {
  const { programs, journalMetrics, isReady } = usePrograms();
  const [topN, setTopN] = useState(30);
  const allWorks = useMemo(() => programs.flatMap((p) => p.works), [programs]);
  const qualisFilter = useCallback(
    (data: BibWork[], value: string) =>
      data.filter((w) => {
        const m = getWorkJournalMetrics(w, journalMetrics);
        return m?.qualisClass === value;
      }),
    [journalMetrics],
  );
  const { handleDrill, drillDownProps } = useArticleDrillDown(allWorks, qualisFilter);

  const qualisResults = useMemo(
    () => (isReady ? computeQualisComparison(programs, journalMetrics) : []),
    [programs, journalMetrics, isReady],
  );

  const distribution = useMemo(
    () => (isReady ? computeQualisDistribution(programs, journalMetrics) : []),
    [programs, journalMetrics, isReady],
  );

  const journalDetails = useMemo(
    () => (isReady ? computeQualisJournalDetails(programs, journalMetrics) : []),
    [programs, journalMetrics, isReady],
  );

  if (!isReady) {
    return (
      <div className="space-y-6">
        <PageHeader title="Qualis / Produção Ponderada" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qualis / Produção Ponderada"
        description="Classificação Qualis (A1–A8) baseada no percentil CiteScore (Scopus) e cálculo de produção bibliográfica ponderada."
        badge="Programas"
      />

      {/* Weighted production KPIs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="size-4" />
            Produção Bibliográfica Ponderada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Fórmula: <code>Prod = #A1×1,0 + #A2×0,875 + #A3×0,75 + #A4×0,625</code> (A5–A8 peso 0)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                  {qualisResults.map((q) => (
                    <th key={q.datasetId} className="text-right py-2 px-3 font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: q.color }} />
                        <span className="truncate max-w-[120px]">{q.datasetName}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b font-semibold bg-muted/30">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <Award className="size-3.5 text-primary" />
                      Produção Ponderada Total
                    </div>
                  </td>
                  {qualisResults.map((q, i) => {
                    const delta = i > 0 ? pctDelta(q.weightedTotal, qualisResults[0].weightedTotal) : null;
                    return (
                      <td key={q.datasetId} className="text-right py-2.5 px-3 tabular-nums">
                        {q.weightedTotal.toFixed(2)}
                        {delta !== null && delta !== 0 && (
                          <span className={`text-xs ml-1 ${delta > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {delta > 0 ? "+" : ""}
                            {delta}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {QUALIS_CLASSES.map((cls) => (
                  <tr key={cls} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="outline" className="text-xs font-mono px-1.5">
                          {cls}
                        </Badge>
                        <span className="text-xs text-muted-foreground/70">
                          (peso {QUALIS_WEIGHTS[cls]})
                        </span>
                      </div>
                    </td>
                    {qualisResults.map((q) => (
                      <td key={q.datasetId} className="text-right py-2 px-3 tabular-nums">
                        {q.counts[cls] ?? 0}
                      </td>
                    ))}
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
          <TabsTrigger value="detalhes" className="gap-1.5">
            <Table2 className="size-3.5" />
            Periódicos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribuicao" className="mt-4">
          <ChartContainer
            title="Distribuição Qualis por Programa"
            description="Número de artigos em cada faixa Qualis (A1–A8) para cada programa."
          >
            <ComparisonBarChart
              data={distribution}
              categoryKey="category"
              datasets={programs}
              layout="horizontal"
              height={380}
              stacked={false}
              onBarClick={(e) => handleDrill(String(e.category))}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="detalhes" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="size-4" />
                Detalhes por Periódico
                <div className="ml-auto">
                  <TopNSelector value={topN} onChange={setTopN} options={[10, 20, 30, 50, 100]} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Periódico</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Qualis</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">CiteScore</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Percentil</th>
                      {programs.map((ds) => (
                        <th key={ds.id} className="text-right py-2 px-2 font-medium">
                          <div className="flex items-center justify-end gap-1">
                            <span className="size-2 rounded-full" style={{ backgroundColor: ds.colorHex }} />
                            <span className="truncate max-w-[80px]">{ds.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {journalDetails.slice(0, topN).map((j) => (
                      <tr key={j.issn} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 pr-3 max-w-[250px] truncate" title={j.title}>
                          {j.title || j.issn}
                        </td>
                        <td className="text-right py-2 px-2">
                          {j.qualisClass ? (
                            <Badge variant="outline" className="text-xs font-mono px-1.5">
                              {j.qualisClass}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums">
                          {j.citeScore?.toFixed(1) ?? "–"}
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums">
                          {j.percentile?.toFixed(0) ?? "–"}
                        </td>
                        {j.articleCounts.map((count, idx) => (
                          <td key={idx} className="text-right py-2 px-2 tabular-nums">
                            {count > 0 ? count : <span className="text-muted-foreground/40">0</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {journalDetails.length > topN && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Exibindo {topN} de {journalDetails.length} periódicos.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { OverlapDisplay } from "@/components/comparison/overlap-display";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useProgramDrillDown } from "@/hooks/use-drill-down";
import { filterWorksByField } from "@/lib/data-processing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hash } from "lucide-react";
import {
  computeKeywordOverlap,
  computeTopKeywordsComparison,
  computeResearchAreasComparison,
} from "@/lib/comparison/analyses";

export default function ProgramasTematicoPage() {
  const { programs, isReady } = usePrograms();
  const [topN, setTopN] = useState(20);
  const fieldRef = useRef("DE");
  const customFilter = useCallback(
    (data: import("@/types/bibliometric").BibWork[], value: string) =>
      filterWorksByField(data, fieldRef.current, value),
    [],
  );
  const { handleDrill, drillDownProps } = useProgramDrillDown(programs, customFilter);
  const drillKeyword = useCallback((e: Record<string, unknown>, dsId: string) => { fieldRef.current = "DE"; handleDrill(String(e.name), dsId); }, [handleDrill]);
  const drillArea = useCallback((e: Record<string, unknown>, dsId: string) => { fieldRef.current = "WC"; handleDrill(String(e.name), dsId); }, [handleDrill]);

  const keywordOverlap = useMemo(
    () => (isReady ? computeKeywordOverlap(programs) : null),
    [programs, isReady],
  );

  const topKeywords = useMemo(
    () => (isReady ? computeTopKeywordsComparison(programs, topN) : []),
    [programs, isReady, topN],
  );

  const areas = useMemo(
    () => (isReady ? computeResearchAreasComparison(programs, 15) : []),
    [programs, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Temático" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<Hash className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Temático" description="Sobreposição de palavras-chave, ranking comparativo e áreas do conhecimento." badge="Programas" />

      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="areas">Áreas do Conhecimento</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="mt-4">
          {keywordOverlap && (
            <ChartContainer title="Sobreposição de Palavras-chave" description="Palavras-chave compartilhadas e exclusivas entre os programas.">
              <OverlapDisplay result={keywordOverlap} datasets={programs} label="palavras-chave" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} />
          </div>
          <ChartContainer title={`Top ${topN} Palavras-chave`} description="Palavras-chave mais frequentes em cada programa.">
            <ComparisonBarChart
              data={topKeywords}
              categoryKey="name"
              datasets={programs}
              height={Math.max(400, topN * 28)}
              layout="vertical"
              labelMaxLen={40}
              onBarClick={drillKeyword}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="areas" className="mt-4">
          <ChartContainer title="Áreas do Conhecimento" description="Categorias mais frequentes por programa.">
            <ComparisonBarChart
              data={areas}
              categoryKey="name"
              datasets={programs}
              height={Math.max(400, 15 * 28)}
              layout="vertical"
              labelMaxLen={40}
              onBarClick={drillArea}
            />
          </ChartContainer>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

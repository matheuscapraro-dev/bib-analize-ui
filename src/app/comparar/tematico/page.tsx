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
import { Hash } from "lucide-react";
import {
  computeKeywordOverlap,
  computeTopKeywordsComparison,
  computeResearchAreasComparison,
} from "@/lib/comparison/analyses";

export default function TematicoComparativoPage() {
  const { datasets, isReady } = useComparison();
  const [topN, setTopN] = useState(20);

  const keywordOverlap = useMemo(
    () => (isReady ? computeKeywordOverlap(datasets) : null),
    [datasets, isReady],
  );

  const topKeywords = useMemo(
    () => (isReady ? computeTopKeywordsComparison(datasets, topN) : []),
    [datasets, isReady, topN],
  );

  const areas = useMemo(
    () => (isReady ? computeResearchAreasComparison(datasets, 15) : []),
    [datasets, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Temático" description="Compare palavras-chave e áreas de pesquisa." />
        <EmptyState message="Selecione pelo menos 2 datasets na Visão Geral." icon={<Hash className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Temático" description="Sobreposição de palavras-chave, ranking comparativo e áreas do conhecimento." />

      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="areas">Áreas do Conhecimento</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="mt-4">
          {keywordOverlap && (
            <ChartContainer title="Sobreposição de Palavras-chave" description="Palavras-chave compartilhadas e exclusivas entre os datasets.">
              <OverlapDisplay result={keywordOverlap} datasets={datasets} label="palavras-chave" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} />
          </div>
          <ChartContainer title={`Top ${topN} Palavras-chave`} description="Palavras-chave mais frequentes em cada dataset.">
            <ComparisonBarChart
              data={topKeywords}
              categoryKey="name"
              datasets={datasets}
              height={Math.max(400, topN * 28)}
              layout="vertical"
              labelMaxLen={40}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="areas" className="mt-4">
          <ChartContainer title="Áreas do Conhecimento" description="Categorias WoS/OpenAlex mais frequentes.">
            <ComparisonBarChart
              data={areas}
              categoryKey="name"
              datasets={datasets}
              height={Math.max(400, 15 * 28)}
              layout="vertical"
              labelMaxLen={40}
            />
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}

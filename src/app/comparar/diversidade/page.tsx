"use client";

import { useMemo, useState } from "react";
import { useComparison } from "@/store/comparison-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopNSelector } from "@/components/top-n-selector";
import { Layers } from "lucide-react";
import {
  computeOaComparison,
  computeDocTypeComparison,
  computeLanguageComparison,
  computeFundingComparison,
} from "@/lib/comparison/analyses";

export default function DiversidadeComparativaPage() {
  const { datasets, isReady } = useComparison();
  const [topN, setTopN] = useState(10);

  const oaData = useMemo(
    () => (isReady ? computeOaComparison(datasets) : []),
    [datasets, isReady],
  );

  const docTypes = useMemo(
    () => (isReady ? computeDocTypeComparison(datasets) : []),
    [datasets, isReady],
  );

  const languages = useMemo(
    () => (isReady ? computeLanguageComparison(datasets, topN) : []),
    [datasets, isReady, topN],
  );

  const funding = useMemo(
    () => (isReady ? computeFundingComparison(datasets) : []),
    [datasets, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Diversidade" description="Compare diversidade de Open Access, tipos, idiomas e financiamento." />
        <EmptyState message="Selecione pelo menos 2 datasets na Visão Geral." icon={<Layers className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Diversidade" description="Open Access, tipos de documento, idiomas e financiamento." />

      <Tabs defaultValue="oa">
        <TabsList>
          <TabsTrigger value="oa">Open Access</TabsTrigger>
          <TabsTrigger value="doctype">Tipos de Documento</TabsTrigger>
          <TabsTrigger value="lang">Idiomas</TabsTrigger>
          <TabsTrigger value="funding">Financiamento</TabsTrigger>
        </TabsList>

        <TabsContent value="oa" className="mt-4">
          <ChartContainer title="Proporção de Open Access" description="Percentual por status de Open Access em cada dataset.">
            <ComparisonBarChart
              data={oaData}
              categoryKey="category"
              datasets={datasets}
              layout="horizontal"
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="doctype" className="mt-4">
          <ChartContainer title="Tipos de Documento" description="Distribuição de tipos de documento (article, review, etc.).">
            <ComparisonBarChart
              data={docTypes}
              categoryKey="category"
              datasets={datasets}
              layout="horizontal"
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="lang" className="mt-4">
          <ChartContainer
            title="Idiomas"
            description="Principais idiomas de publicação."
            actions={<TopNSelector value={topN} onChange={setTopN} options={[5, 10, 15, 20]} />}
          >
            <ComparisonBarChart
              data={languages}
              categoryKey="category"
              datasets={datasets}
              layout="horizontal"
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="funding" className="mt-4">
          <ChartContainer title="Financiamento" description="Proporção de artigos com financiamento declarado.">
            {funding.length > 0 ? (
              <ComparisonBarChart
                data={funding}
                categoryKey="category"
                datasets={datasets}
                layout="horizontal"
              />
            ) : (
              <EmptyState message="Dados de financiamento indisponíveis para os datasets selecionados." />
            )}
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}

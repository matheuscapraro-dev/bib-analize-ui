"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { filterWorksByField } from "@/lib/data-processing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen } from "lucide-react";
import type { BibWork } from "@/types/bibliometric";
import {
  computeOaComparison,
  computeDocTypeComparison,
  computeLanguageComparison,
  computeFundingComparison,
} from "@/lib/comparison/analyses";

export default function ProgramasDiversidadePage() {
  const { programs, isReady } = usePrograms();
  const [topN, setTopN] = useState(10);
  const allWorks = useMemo(() => programs.flatMap((p) => p.works), [programs]);
  const fieldRef = useRef("OA");
  const customFilter = useCallback(
    (data: BibWork[], value: string) => {
      if (fieldRef.current === "OA") {
        const cat = value.toLowerCase();
        return data.filter((w) => {
          const oa = (w.OA ?? "").toLowerCase();
          return cat === "closed" ? (!w.OA || oa === "fechado" || oa === "closed") : oa === cat;
        });
      }
      return filterWorksByField(data, fieldRef.current, value);
    },
    [],
  );
  const { handleDrill, drillDownProps } = useArticleDrillDown(allWorks, customFilter);
  const drillOA = useCallback((e: Record<string, unknown>) => { fieldRef.current = "OA"; handleDrill(String(e.category)); }, [handleDrill]);
  const drillDT = useCallback((e: Record<string, unknown>) => { fieldRef.current = "DT"; handleDrill(String(e.category)); }, [handleDrill]);
  const drillLA = useCallback((e: Record<string, unknown>) => { fieldRef.current = "LA"; handleDrill(String(e.category)); }, [handleDrill]);
  const drillFU = useCallback((e: Record<string, unknown>) => { fieldRef.current = "FU"; handleDrill(String(e.name ?? e.category)); }, [handleDrill]);

  const oaData = useMemo(
    () => (isReady ? computeOaComparison(programs) : []),
    [programs, isReady],
  );

  const docTypes = useMemo(
    () => (isReady ? computeDocTypeComparison(programs) : []),
    [programs, isReady],
  );

  const languages = useMemo(
    () => (isReady ? computeLanguageComparison(programs, topN) : []),
    [programs, isReady, topN],
  );

  const funding = useMemo(
    () => (isReady ? computeFundingComparison(programs, topN) : []),
    [programs, isReady, topN],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Diversidade" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<BookOpen className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Diversidade" description="Open Access, tipos de documento, idiomas e financiamento." badge="Programas" />

      <Tabs defaultValue="oa">
        <TabsList>
          <TabsTrigger value="oa">Open Access</TabsTrigger>
          <TabsTrigger value="doctypes">Tipos de Doc.</TabsTrigger>
          <TabsTrigger value="languages">Idiomas</TabsTrigger>
          <TabsTrigger value="funding">Financiamento</TabsTrigger>
        </TabsList>

        <TabsContent value="oa" className="mt-4">
          <ChartContainer
            title="Open Access"
            description="Distribuição comparativa de modalidades Open Access."
            actions={<TopNSelector value={topN} onChange={setTopN} options={[5, 10, 15, 20]} />}
          >
            <ComparisonBarChart
              data={oaData}
              categoryKey="category"
              datasets={programs}
              layout="horizontal"
              height={320}
              onBarClick={drillOA}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="doctypes" className="mt-4">
          <ChartContainer
            title="Tipos de Documento"
            description="Distribuição comparativa dos tipos de documento."
            actions={<TopNSelector value={topN} onChange={setTopN} options={[5, 10, 15, 20]} />}
          >
            <ComparisonBarChart
              data={docTypes}
              categoryKey="category"
              datasets={programs}
              layout="horizontal"
              height={320}
              onBarClick={drillDT}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="languages" className="mt-4">
          <ChartContainer
            title="Idiomas"
            description="Distribuição comparativa dos idiomas de publicação."
            actions={<TopNSelector value={topN} onChange={setTopN} options={[5, 10, 15, 20]} />}
          >
            <ComparisonBarChart
              data={languages}
              categoryKey="category"
              datasets={programs}
              layout="horizontal"
              height={320}
              onBarClick={drillLA}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="funding" className="mt-4">
          <ChartContainer
            title="Financiamento"
            description="Agências de fomento ou indicadores de financiamento."
            actions={<TopNSelector value={topN} onChange={setTopN} options={[5, 10, 15, 20]} />}
          >
            <ComparisonBarChart
              data={funding}
              categoryKey="category"
              datasets={programs}
              layout="horizontal"
              height={320}
              onBarClick={drillFU}
            />
          </ChartContainer>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

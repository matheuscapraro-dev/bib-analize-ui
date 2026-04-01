"use client";

import { useMemo } from "react";
import { useComparison } from "@/store/comparison-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { OverlayLineChart } from "@/components/charts/overlay-line-chart";
import { EmptyState } from "@/components/empty-state";
import { LineChart as LineIcon } from "lucide-react";
import {
  computeProductionTimeline,
  computeCitationTimeline,
  computeCumulativeGrowth,
} from "@/lib/comparison/analyses";

export default function ProducaoComparativaPage() {
  const { datasets, isReady } = useComparison();

  const production = useMemo(
    () => (isReady ? computeProductionTimeline(datasets) : []),
    [datasets, isReady],
  );

  const citations = useMemo(
    () => (isReady ? computeCitationTimeline(datasets) : []),
    [datasets, isReady],
  );

  const cumulative = useMemo(
    () => (isReady ? computeCumulativeGrowth(datasets) : []),
    [datasets, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Produção Temporal" description="Compare tendências de produção ao longo do tempo." />
        <EmptyState message="Selecione pelo menos 2 datasets na Visão Geral." icon={<LineIcon className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Produção Temporal" description="Compare tendências de produção, citações e crescimento acumulado." />

      <ChartContainer
        title="Publicações por Ano"
        description="Número de documentos publicados por ano em cada dataset."
      >
        <OverlayLineChart
          data={production}
          xKey="year"
          datasets={datasets}
          yLabel="Documentos"
        />
      </ChartContainer>

      <ChartContainer
        title="Citações Médias por Ano"
        description="Média de citações por documento publicado em cada ano."
      >
        <OverlayLineChart
          data={citations}
          xKey="year"
          datasets={datasets}
          yLabel="Citações/doc"
        />
      </ChartContainer>

      <ChartContainer
        title="Crescimento Acumulado"
        description="Total acumulado de publicações ao longo do tempo."
      >
        <OverlayLineChart
          data={cumulative}
          xKey="year"
          datasets={datasets}
          yLabel="Acumulado"
        />
      </ChartContainer>
    </div>
  );
}

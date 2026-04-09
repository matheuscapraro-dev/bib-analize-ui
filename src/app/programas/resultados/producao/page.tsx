"use client";

import { useCallback, useMemo } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { OverlayLineChart } from "@/components/charts/overlay-line-chart";
import { EmptyState } from "@/components/empty-state";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { LineChart as LineIcon } from "lucide-react";
import type { BibWork } from "@/types/bibliometric";
import {
  computeProductionTimeline,
  computeCitationTimeline,
  computeCumulativeGrowth,
} from "@/lib/comparison/analyses";

export default function ProgramasProducaoPage() {
  const { programs, isReady } = usePrograms();
  const allWorks = useMemo(() => programs.flatMap((p) => p.works), [programs]);
  const yearFilter = useCallback(
    (data: BibWork[], value: string) =>
      data.filter((w) => String(w.PY) === value),
    [],
  );
  const { handleDrill, drillDownProps } = useArticleDrillDown(allWorks, yearFilter);
  const onDotClick = useCallback(
    (e: Record<string, unknown>) => handleDrill(String(e.year)),
    [handleDrill],
  );

  const production = useMemo(
    () => (isReady ? computeProductionTimeline(programs) : []),
    [programs, isReady],
  );

  const citations = useMemo(
    () => (isReady ? computeCitationTimeline(programs) : []),
    [programs, isReady],
  );

  const cumulative = useMemo(
    () => (isReady ? computeCumulativeGrowth(programs) : []),
    [programs, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Produção Temporal" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<LineIcon className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Produção Temporal" description="Compare tendências de produção, citações e crescimento acumulado." badge="Programas" />

      <ChartContainer title="Publicações por Ano" description="Número de documentos publicados por ano em cada programa.">
        <OverlayLineChart data={production} xKey="year" datasets={programs} yLabel="Documentos" onDotClick={onDotClick} />
      </ChartContainer>

      <ChartContainer title="Citações Médias por Ano" description="Média de citações por documento publicado em cada ano.">
        <OverlayLineChart data={citations} xKey="year" datasets={programs} yLabel="Citações/doc" onDotClick={onDotClick} />
      </ChartContainer>

      <ChartContainer title="Crescimento Acumulado" description="Total acumulado de publicações ao longo do tempo.">
        <OverlayLineChart data={cumulative} xKey="year" datasets={programs} yLabel="Acumulado" onDotClick={onDotClick} />
      </ChartContainer>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

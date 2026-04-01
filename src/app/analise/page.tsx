"use client";

import { useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { yearlyStats, countValues, topN } from "@/lib/data-processing";
import {
  FileText, Users, BookOpen, TrendingUp, Calendar,
} from "lucide-react";

export default function OverviewPage() {
  const { filtered, kpis } = useBib();
  const yearRef = useChartRef();
  const typeRef = useChartRef();
  const srcRef = useChartRef();

  const ys = useMemo(() => yearlyStats(filtered), [filtered]);
  const yearData = useMemo(() => ys.map((y) => ({ year: y.year, docs: y.count, cites: y.totalCitations })), [ys]);

  const docTypes = useMemo(() => {
    const c = countValues(filtered, "DT");
    return topN(c, 10).map(([n, v]) => ({ name: n, value: v }));
  }, [filtered]);

  const topSources = useMemo(() => {
    const c = countValues(filtered, "SO");
    return topN(c, 10).map(([n, v]) => ({ name: n, count: v }));
  }, [filtered]);

  if (!kpis) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Visão Geral" description="Resumo dos principais indicadores bibliométricos" badge={`${filtered.length} docs`} />

      <KpiGrid>
        <KpiCard title="Documentos" value={kpis.totalWorks} icon={<FileText className="size-5" />} />
        <KpiCard title="Autores" value={kpis.uniqueAuthors} icon={<Users className="size-5" />} />
        <KpiCard title="Fontes" value={kpis.uniqueSources} icon={<BookOpen className="size-5" />} />
        <KpiCard title="Citações" value={kpis.totalCitations} icon={<TrendingUp className="size-5" />} />
        <KpiCard title="Período" value={`${kpis.yearRange[0]}–${kpis.yearRange[1]}`} icon={<Calendar className="size-5" />} />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer
          ref={yearRef}
          title="Produção por Ano"
          description="Documentos publicados por ano"
          actions={<ChartExportButton chartRef={yearRef} fileName="producao-anual" />}
        >
          <BarChart data={yearData} xKey="year" bars={[{ key: "docs", label: "Documentos" }]} />
        </ChartContainer>

        <ChartContainer
          ref={srcRef}
          title="Top 10 Fontes"
          description="Fontes com maior volume de publicações"
          actions={<ChartExportButton chartRef={srcRef} fileName="top-fontes" />}
        >
          <BarChart
            data={topSources}
            xKey="name"
            bars={[{ key: "count", label: "Documentos" }]}
            layout="vertical"
          />
        </ChartContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer
          ref={typeRef}
          title="Tipos de Documento"
          description="Distribuição por tipo"
          actions={<ChartExportButton chartRef={typeRef} fileName="tipos-documento" />}
        >
          <PieChart data={docTypes} innerRadius={60} />
        </ChartContainer>

        <ChartContainer title="Tendência de Citações" description="Citações acumuladas por ano">
          <LineChart data={yearData} xKey="year" lines={[{ key: "cites", label: "Citações" }]} />
        </ChartContainer>
      </div>
    </div>
  );
}

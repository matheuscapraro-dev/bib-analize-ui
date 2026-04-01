"use client";

import { useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { ScatterChart } from "@/components/charts/scatter-chart";
import { LineChart } from "@/components/charts/line-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { yearlyStats } from "@/lib/data-processing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { TrendingUp, BookOpen, Hash } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { BibWork } from "@/types/bibliometric";

interface CiteRow { rank: number; title: string; authors: string; year: number | null; citations: number; }

const columns: ColumnDef<CiteRow, unknown>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "title", header: "Título", cell: ({ getValue }) => <span className="line-clamp-2 max-w-md">{getValue() as string}</span> },
  { accessorKey: "authors", header: "Autores", cell: ({ getValue }) => <span className="truncate max-w-[150px] block">{getValue() as string}</span> },
  { accessorKey: "year", header: "Ano" },
  { accessorKey: "citations", header: "Citações" },
];

export default function CitacoesPage() {
  const { filtered } = useBib();
  const scatterRef = useChartRef();
  const trendRef = useChartRef();
  const topRef = useChartRef();

  const totalCites = useMemo(() => filtered.reduce((s, w) => s + (w.TC ?? 0), 0), [filtered]);
  const avgCites = useMemo(() => filtered.length ? totalCites / filtered.length : 0, [totalCites, filtered.length]);
  const medianCites = useMemo(() => {
    const sorted = filtered.map((w) => w.TC ?? 0).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [filtered]);

  const scatterData = useMemo(() => filtered
    .filter((w) => w.PY != null && w.PY > 0)
    .map((w) => ({ year: w.PY!, citations: w.TC ?? 0 })), [filtered]);

  const ys = useMemo(() => yearlyStats(filtered), [filtered]);
  const trendData = useMemo(() => ys.map((y) => ({ year: y.year, média: y.avgCitations, total: y.totalCitations })), [ys]);

  const topCited = useMemo(() =>
    [...filtered]
      .sort((a, b) => (b.TC ?? 0) - (a.TC ?? 0))
      .slice(0, 50)
      .map((w, i) => ({
        rank: i + 1,
        title: w.TI ?? "",
        authors: w.AU ?? "",
        year: w.PY,
        citations: w.TC ?? 0,
      })),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Citações" description="Análise de impacto por citações" />

      <KpiGrid>
        <KpiCard title="Total de Citações" value={totalCites} icon={<TrendingUp className="size-5" />} />
        <KpiCard title="Média/Doc" value={avgCites.toFixed(1)} icon={<BookOpen className="size-5" />} />
        <KpiCard title="Mediana" value={medianCites.toFixed(0)} icon={<Hash className="size-5" />} />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer ref={scatterRef} title="Citações vs Ano" actions={<ChartExportButton chartRef={scatterRef} fileName="citacoes-scatter" />}>
          <ScatterChart data={scatterData} xKey="year" yKey="citations" xLabel="Ano de publicação" yLabel="Citações" />
        </ChartContainer>
        <ChartContainer ref={trendRef} title="Tendência de Citações" actions={<ChartExportButton chartRef={trendRef} fileName="citacoes-trend" />}>
          <LineChart data={trendData} xKey="year" lines={[{ key: "média", label: "Média" }, { key: "total", label: "Total", dashed: true }]} showLegend />
        </ChartContainer>
      </div>

      <ChartContainer ref={topRef} title="Top 20 Mais Citados">
        <BarChart
          data={topCited.slice(0, 20).map((r) => ({ name: r.title.slice(0, 50) + (r.title.length > 50 ? "…" : ""), citações: r.citations }))}
          xKey="name" bars={[{ key: "citações", label: "Citações" }]} layout="vertical" height={500}
        />
      </ChartContainer>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 50 Artigos Mais Citados</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={topCited} />
        </CardContent>
      </Card>
    </div>
  );
}

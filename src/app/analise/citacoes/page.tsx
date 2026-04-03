"use client";

import { useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { ScatterChart } from "@/components/charts/scatter-chart";
import { LineChart } from "@/components/charts/line-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import {
  yearlyStats,
  citationDistribution,
  fwciDistribution,
  extractTopReferences,
  referenceYearDistribution,
  priceIndex,
} from "@/lib/data-processing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BookOpen, Hash, BarChart3, Target, FileText } from "lucide-react";
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

interface RefRow { rank: number; reference: string; count: number; }

const refColumns: ColumnDef<RefRow, unknown>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "reference", header: "Referência", cell: ({ getValue }) => <span className="line-clamp-2 max-w-lg">{getValue() as string}</span> },
  { accessorKey: "count", header: "Citações" },
];

export default function CitacoesPage() {
  const { filtered } = useBib();
  const scatterRef = useChartRef();
  const trendRef = useChartRef();
  const topRef = useChartRef();
  const distRef = useChartRef();
  const fwciBarRef = useChartRef();
  const fwciScatterRef = useChartRef();
  const refBarRef = useChartRef();
  const refYearRef = useChartRef();

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

  // Distribution data
  const citDistBins = useMemo(() => citationDistribution(filtered).bins.map(b => ({ label: b.label, count: b.count })), [filtered]);
  const uncitedPct = useMemo(() => citationDistribution(filtered).uncitedPct, [filtered]);

  // FWCI data
  const fwci = useMemo(() => fwciDistribution(filtered), [filtered]);
  const fwciBins = useMemo(() => fwci.bins.map(b => ({ label: b.label, count: b.count })), [fwci]);
  const fwciScatter = useMemo(() =>
    filtered
      .filter((w) => w._FWCI != null && w.TC != null)
      .map((w) => ({ fwci: w._FWCI as number, citations: w.TC ?? 0 })),
    [filtered],
  );

  // Reference data
  const topRefs = useMemo(() => extractTopReferences(filtered, 30), [filtered]);
  const refYearData = useMemo(() => referenceYearDistribution(filtered).map(b => ({ year: b.year, count: b.count })), [filtered]);
  const pi = useMemo(() => priceIndex(filtered), [filtered]);

  const hasRefs = topRefs.length > 0;
  const hasFwci = fwci.totalWithFwci > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Citações" description="Análise de impacto por citações" />

      <KpiGrid>
        <KpiCard title="Total Citações" value={totalCites} icon={<TrendingUp className="size-5" />} />
        <KpiCard title="Média/Doc" value={avgCites.toFixed(1)} icon={<BookOpen className="size-5" />} />
        <KpiCard title="Mediana" value={medianCites.toFixed(0)} icon={<Hash className="size-5" />} />
      </KpiGrid>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><TrendingUp className="size-3.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="distribution" className="gap-1"><BarChart3 className="size-3.5" />Distribuição</TabsTrigger>
          {hasFwci && <TabsTrigger value="fwci" className="gap-1"><Target className="size-3.5" />Impacto Normalizado</TabsTrigger>}
          {hasRefs && <TabsTrigger value="references" className="gap-1"><FileText className="size-3.5" />Referências</TabsTrigger>}
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
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
        </TabsContent>

        {/* Tab: Distribuição */}
        <TabsContent value="distribution" className="space-y-4">
          <KpiGrid>
            <KpiCard title="Sem Citações" value={`${uncitedPct}%`} icon={<Hash className="size-5" />} description={`${filtered.filter((w) => (w.TC ?? 0) === 0).length} artigos`} />
          </KpiGrid>
          <ChartContainer ref={distRef} title="Distribuição de Citações" description="Número de artigos por faixa de citações" actions={<ChartExportButton chartRef={distRef} fileName="citacoes-distribuicao" />}>
            <BarChart data={citDistBins} xKey="label" bars={[{ key: "count", label: "Artigos" }]} height={400} />
          </ChartContainer>
        </TabsContent>

        {/* Tab: Impacto Normalizado (FWCI) */}
        {hasFwci && (
          <TabsContent value="fwci" className="space-y-4">
            <KpiGrid>
              <KpiCard title="FWCI Médio" value={fwci.mean.toFixed(2)} icon={<Target className="size-5" />} description="1.0 = média mundial" />
              <KpiCard title="Acima da Média" value={`${fwci.aboveWorld}%`} icon={<TrendingUp className="size-5" />} description={`FWCI ≥ 1.0`} />
              <KpiCard title="Top 1%" value={`${fwci.top1Pct}%`} icon={<TrendingUp className="size-5" />} />
              <KpiCard title="Top 10%" value={`${fwci.top10Pct}%`} icon={<TrendingUp className="size-5" />} />
            </KpiGrid>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartContainer ref={fwciBarRef} title="Distribuição FWCI" description="Linha de referência: 1.0 = média mundial do campo" actions={<ChartExportButton chartRef={fwciBarRef} fileName="fwci-distribuicao" />}>
                <BarChart data={fwciBins} xKey="label" bars={[{ key: "count", label: "Artigos" }]} height={350} />
              </ChartContainer>
              <ChartContainer ref={fwciScatterRef} title="FWCI vs Citações" actions={<ChartExportButton chartRef={fwciScatterRef} fileName="fwci-scatter" />}>
                <ScatterChart data={fwciScatter} xKey="fwci" yKey="citations" xLabel="FWCI" yLabel="Citações" />
              </ChartContainer>
            </div>
          </TabsContent>
        )}

        {/* Tab: Referências */}
        {hasRefs && (
          <TabsContent value="references" className="space-y-4">
            <KpiGrid>
              <KpiCard title="Total Referências" value={pi.totalRefs} icon={<FileText className="size-5" />} />
              <KpiCard title="Price Index" value={`${pi.index}%`} icon={<TrendingUp className="size-5" />} description="% refs dos últimos 5 anos" />
            </KpiGrid>

            <ChartContainer ref={refBarRef} title="Top 30 Referências Mais Citadas" actions={<ChartExportButton chartRef={refBarRef} fileName="top-referencias" />}>
              <BarChart
                data={topRefs.map((r) => ({ name: r.ref.slice(0, 60) + (r.ref.length > 60 ? "…" : ""), citações: r.count }))}
                xKey="name" bars={[{ key: "citações", label: "Vezes Citada" }]} layout="vertical" height={Math.max(400, topRefs.length * 22)}
              />
            </ChartContainer>

            <ChartContainer ref={refYearRef} title="Distribuição Temporal das Referências" actions={<ChartExportButton chartRef={refYearRef} fileName="refs-timeline" />}>
              <BarChart data={refYearData} xKey="year" bars={[{ key: "count", label: "Referências" }]} height={350} />
            </ChartContainer>

            <Card>
              <CardHeader><CardTitle className="text-base">Top 30 Referências</CardTitle></CardHeader>
              <CardContent>
                <DataTable columns={refColumns} data={topRefs.map((r, i) => ({ rank: i + 1, reference: r.ref, count: r.count }))} searchColumn="reference" searchPlaceholder="Buscar referência..." />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { yearlyStats } from "@/lib/data-processing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { YearlyStats } from "@/types/bibliometric";

const columns: ColumnDef<YearlyStats, unknown>[] = [
  { accessorKey: "year", header: "Ano" },
  { accessorKey: "count", header: "Docs" },
  { accessorKey: "totalCitations", header: "Citações" },
  { accessorKey: "avgCitations", header: "Méd. Cit.", cell: ({ getValue }) => (getValue() as number).toFixed(1) },
  { accessorKey: "cumulativeCount", header: "Acumulado" },
];

export default function ProducaoAnualPage() {
  const { filtered } = useBib();
  const barRef = useChartRef();
  const lineRef = useChartRef();

  const ys = useMemo(() => yearlyStats(filtered), [filtered]);
  const chartData = useMemo(() => ys.map((y) => ({
    ano: y.year,
    documentos: y.count,
    citações: y.totalCitations,
    acumulado: y.cumulativeCount,
    média: y.avgCitations,
  })), [ys]);

  const avgGrowth = useMemo(() => {
    if (ys.length < 2) return 0;
    const rates = [];
    for (let i = 1; i < ys.length; i++) {
      if (ys[i - 1].count > 0) rates.push(((ys[i].count - ys[i - 1].count) / ys[i - 1].count) * 100);
    }
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  }, [ys]);

  return (
    <div className="space-y-6">
      <PageHeader title="Produção Anual" description="Evolução temporal da produção científica" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground uppercase">Período</p>
            <p className="text-lg font-bold">{ys.length ? `${ys[0].year}–${ys[ys.length - 1].year}` : "–"}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground uppercase">Anos Analisados</p>
            <p className="text-lg font-bold">{ys.length}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground uppercase">Crescimento Médio</p>
            <p className="text-lg font-bold">{avgGrowth.toFixed(1)}% a.a.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer ref={barRef} title="Documentos por Ano" actions={<ChartExportButton chartRef={barRef} fileName="docs-por-ano" />}>
          <BarChart data={chartData} xKey="ano" bars={[{ key: "documentos", label: "Documentos" }]} />
        </ChartContainer>

        <ChartContainer ref={lineRef} title="Produção Acumulada" actions={<ChartExportButton chartRef={lineRef} fileName="producao-acumulada" />}>
          <LineChart data={chartData} xKey="ano" lines={[{ key: "acumulado", label: "Acumulado" }]} />
        </ChartContainer>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados por Ano</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={ys} pageSize={20} />
        </CardContent>
      </Card>
    </div>
  );
}

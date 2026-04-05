"use client";

import { useCallback, useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { PieChart } from "@/components/charts/pie-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { countValues, topN } from "@/lib/data-processing";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface LangRow { language: string; count: number; pct: string; }

const columns: ColumnDef<LangRow, unknown>[] = [
  { accessorKey: "language", header: "Idioma" },
  { accessorKey: "count", header: "Documentos" },
  { accessorKey: "pct", header: "%" },
];

export default function IdiomasPage() {
  const { filtered } = useBib();
  const pieRef = useChartRef();
  const barRef = useChartRef();
  const { handleDrill, drillDownProps } = useArticleDrillDown(filtered, "LA");

  const langCounts = useMemo(() => countValues(filtered, "LA"), [filtered]);
  const top = useMemo(() => topN(langCounts, 20), [langCounts]);
  const pieData = useMemo(() => top.map(([n, v]) => ({ name: n, value: v })), [top]);
  const barData = useMemo(() => top.map(([n, v]) => ({ language: n, count: v })), [top]);
  const tableData = useMemo(() => top.map(([n, v]) => ({
    language: n, count: v, pct: ((v / filtered.length) * 100).toFixed(1) + "%",
  })), [top, filtered.length]);

  return (
    <div className="space-y-6">
      <PageHeader title="Idiomas" description="Distribuição por idioma de publicação" badge={`${langCounts.size} idiomas`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer ref={pieRef} title="Distribuição por Idioma" actions={<ChartExportButton chartRef={pieRef} fileName="idiomas-pie" />}>
          <PieChart data={pieData} innerRadius={60} onSliceClick={(e) => handleDrill(e.name)} />
        </ChartContainer>
        <ChartContainer ref={barRef} title="Top Idiomas" actions={<ChartExportButton chartRef={barRef} fileName="idiomas-bar" />}>
          <BarChart data={barData} xKey="language" bars={[{ key: "count", label: "Documentos" }]} layout="vertical" onBarClick={(e) => handleDrill(String(e.language))} />
        </ChartContainer>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Todos os Idiomas</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={tableData} onRowClick={(row) => handleDrill(row.language)} />
        </CardContent>
      </Card>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

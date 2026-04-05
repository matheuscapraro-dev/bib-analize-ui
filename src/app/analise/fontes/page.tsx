"use client";

import { useCallback, useMemo, useState } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { countValues, topN } from "@/lib/data-processing";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { TopNSelector } from "@/components/top-n-selector";
import type { ColumnDef } from "@tanstack/react-table";

interface SourceRow { rank: number; name: string; count: number; pct: string; }

const columns: ColumnDef<SourceRow, unknown>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "name", header: "Fonte" },
  { accessorKey: "count", header: "Docs" },
  { accessorKey: "pct", header: "%" },
];

export default function FontesPage() {
  const { filtered } = useBib();
  const [topCount, setTopCount] = useState(20);
  const barRef = useChartRef();
  const { handleDrill, drillDownProps } = useArticleDrillDown(filtered, "SO");

  const allSources = useMemo(() => countValues(filtered, "SO"), [filtered]);
  const topSources = useMemo(() => topN(allSources, topCount), [allSources, topCount]);
  const chartData = useMemo(() => topSources.map(([n, v]) => ({ name: n, count: v })), [topSources]);
  const tableData = useMemo(() => topSources.map(([n, v], i) => ({
    rank: i + 1, name: n, count: v, pct: ((v / filtered.length) * 100).toFixed(1) + "%",
  })), [topSources, filtered.length]);

  return (
    <div className="space-y-6">
      <PageHeader title="Fontes" description="Periódicos e fontes de publicação">
        <TopNSelector value={topCount} onChange={setTopCount} />
      </PageHeader>

      <ChartContainer ref={barRef} title={`Top ${topCount} Fontes`} actions={<ChartExportButton chartRef={barRef} fileName="top-fontes" />}>
        <BarChart data={chartData} xKey="name" bars={[{ key: "count", label: "Documentos" }]} layout="vertical" height={Math.max(350, topCount * 25)} onBarClick={(e) => handleDrill(String(e.name))} />
      </ChartContainer>

      <Card>
        <CardHeader><CardTitle className="text-base">Ranking de Fontes</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={tableData} searchColumn="name" searchPlaceholder="Buscar fonte..." onRowClick={(row) => handleDrill(row.name)} />
        </CardContent>
      </Card>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

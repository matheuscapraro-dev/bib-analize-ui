"use client";

import { useCallback, useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { PieChart } from "@/components/charts/pie-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { countValues, topN, oaCitationImpact } from "@/lib/data-processing";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { BookOpen, Lock, Unlock, TrendingUp } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface OaRow { status: string; count: number; pct: string; }

const columns: ColumnDef<OaRow, unknown>[] = [
  { accessorKey: "status", header: "Status OA" },
  { accessorKey: "count", header: "Documentos" },
  { accessorKey: "pct", header: "%" },
];

interface ImpactRow { status: string; count: number; meanCitations: number; medianCitations: number; totalCitations: number; }

const impactColumns: ColumnDef<ImpactRow, unknown>[] = [
  { accessorKey: "status", header: "Status OA" },
  { accessorKey: "count", header: "Docs" },
  { accessorKey: "meanCitations", header: "Média Citações" },
  { accessorKey: "medianCitations", header: "Mediana" },
  { accessorKey: "totalCitations", header: "Total Citações" },
];

export default function OpenAccessPage() {
  const { filtered } = useBib();
  const pieRef = useChartRef();
  const trendRef = useChartRef();
  const impactRef = useChartRef();
  const { handleDrill, drillDownProps } = useArticleDrillDown(filtered, "OA");

  const oaCounts = useMemo(() => countValues(filtered, "OA"), [filtered]);
  const oaData = useMemo(() => topN(oaCounts, 20).map(([n, v]) => ({ name: n, value: v })), [oaCounts]);
  const tableData = useMemo(() => topN(oaCounts, 50).map(([n, v]) => ({
    status: n, count: v, pct: ((v / filtered.length) * 100).toFixed(1) + "%",
  })), [oaCounts, filtered.length]);

  const oaTotal = useMemo(() => {
    let count = 0;
    for (const w of filtered) {
      const status = (w.OA ?? "").toLowerCase();
      if (status && status !== "closed" && status !== "not oa" && status !== "") count++;
    }
    return count;
  }, [filtered]);

  const oaTrend = useMemo(() => {
    const yearOa = new Map<number, { open: number; closed: number }>();
    for (const w of filtered) {
      const y = w.PY;
      if (!y) continue;
      const entry = yearOa.get(y) ?? { open: 0, closed: 0 };
      const status = (w.OA ?? "").toLowerCase();
      if (status && status !== "closed" && status !== "not oa" && status !== "") entry.open++;
      else entry.closed++;
      yearOa.set(y, entry);
    }
    return [...yearOa.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, v]) => ({ year, open: v.open, closed: v.closed }));
  }, [filtered]);

  const impact = useMemo(() => oaCitationImpact(filtered), [filtered]);
  const impactChart = useMemo(() =>
    impact.map((r) => ({ name: r.status, média: r.meanCitations })),
    [impact],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Open Access" description="Análise de acesso aberto das publicações" />

      <KpiGrid>
        <KpiCard title="Open Access" value={oaTotal} icon={<Unlock className="size-5" />} description={`${((oaTotal / filtered.length) * 100).toFixed(1)}%`} />
        <KpiCard title="Fechado" value={filtered.length - oaTotal} icon={<Lock className="size-5" />} />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer ref={pieRef} title="Distribuição OA" actions={<ChartExportButton chartRef={pieRef} fileName="oa-distribuicao" />}>
          <PieChart data={oaData} innerRadius={60} onSliceClick={(e) => handleDrill(e.name)} />
        </ChartContainer>
        <ChartContainer ref={trendRef} title="Tendência OA por Ano" actions={<ChartExportButton chartRef={trendRef} fileName="oa-trend" />}>
          <BarChart data={oaTrend} xKey="year" bars={[{ key: "open", label: "Open Access", stackId: "a" }, { key: "closed", label: "Fechado", stackId: "a", color: "#94a3b8" }]} showLegend />
        </ChartContainer>
      </div>

      {/* Impacto por tipo OA */}
      <ChartContainer ref={impactRef} title="Média de Citações por Tipo OA" description="Comparação do impacto médio de citações entre tipos de acesso" actions={<ChartExportButton chartRef={impactRef} fileName="oa-impacto" />}>
        <BarChart data={impactChart} xKey="name" bars={[{ key: "média", label: "Média de Citações" }]} layout="vertical" height={Math.max(250, impact.length * 45)} />
      </ChartContainer>

      <Card>
        <CardHeader><CardTitle className="text-base">Impacto por Status OA</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={impactColumns} data={impact} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento por Status</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={tableData} onRowClick={(row) => handleDrill(row.status)} />
        </CardContent>
      </Card>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

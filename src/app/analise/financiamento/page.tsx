"use client";

import { useMemo, useState } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { DataTable } from "@/components/data-table";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface AgencyRow { agency: string; count: number; pct: string; }
interface YearFundRow { year: number; total: number; funded: number; pctFunded: string; }

const agencyCols: ColumnDef<AgencyRow, unknown>[] = [
  { accessorKey: "agency", header: "Agência" },
  { accessorKey: "count", header: "Artigos" },
  { accessorKey: "pct", header: "%" },
];

const yearCols: ColumnDef<YearFundRow, unknown>[] = [
  { accessorKey: "year", header: "Ano" },
  { accessorKey: "total", header: "Total" },
  { accessorKey: "funded", header: "Financiados" },
  { accessorKey: "pctFunded", header: "% Financiados" },
];

export default function FinanciamentoPage() {
  const { filtered } = useBib();
  const agencyRef = useChartRef();
  const trendRef = useChartRef();
  const impactRef = useChartRef();
  const [topN, setTopN] = useState(20);

  const { funded, notFunded, pctFunded, avgCitFunded, avgCitNotFunded } = useMemo(() => {
    let fundedCount = 0;
    let citFunded = 0;
    let citNotFunded = 0;
    let notFundedCount = 0;
    for (const w of filtered) {
      const fu = w.FU ?? "";
      const cit = w.Z9 ?? w.TC ?? 0;
      if (fu.trim()) {
        fundedCount++;
        citFunded += Number(cit) || 0;
      } else {
        notFundedCount++;
        citNotFunded += Number(cit) || 0;
      }
    }
    return {
      funded: fundedCount,
      notFunded: notFundedCount,
      pctFunded: filtered.length > 0 ? ((fundedCount / filtered.length) * 100).toFixed(1) : "0",
      avgCitFunded: fundedCount > 0 ? Math.round((citFunded / fundedCount) * 10) / 10 : 0,
      avgCitNotFunded: notFundedCount > 0 ? Math.round((citNotFunded / notFundedCount) * 10) / 10 : 0,
    };
  }, [filtered]);

  // Top agencies
  const agencyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of filtered) {
      const fu = w.FU ?? "";
      if (!fu.trim()) continue;
      for (const agency of fu.split(";").map((a) => a.trim()).filter(Boolean)) {
        map.set(agency, (map.get(agency) ?? 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const agencyChart = useMemo(
    () => agencyCounts.slice(0, topN).map(([name, value]) => ({ name, Artigos: value })),
    [agencyCounts, topN],
  );

  const agencyTable: AgencyRow[] = useMemo(
    () => agencyCounts.map(([a, c]) => ({
      agency: a, count: c, pct: ((c / filtered.length) * 100).toFixed(1) + "%",
    })),
    [agencyCounts, filtered.length],
  );

  // Yearly funding trend
  const yearlyFunding = useMemo(() => {
    const byYear = new Map<number, { total: number; funded: number }>();
    for (const w of filtered) {
      const y = w.PY;
      if (!y || y < 1900) continue;
      const entry = byYear.get(y) ?? { total: 0, funded: 0 };
      entry.total++;
      if ((w.FU ?? "").trim()) entry.funded++;
      byYear.set(y, entry);
    }
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, e]) => ({
        year,
        total: e.total,
        funded: e.funded,
        pctFunded: e.total > 0 ? ((e.funded / e.total) * 100).toFixed(1) + "%" : "0%",
      }));
  }, [filtered]);

  const trendBarData = useMemo(
    () => yearlyFunding.map((y) => ({ name: String(y.year), Financiados: y.funded, Total: y.total })),
    [yearlyFunding],
  );

  const trendLineData = useMemo(
    () => yearlyFunding.map((y) => ({
      name: String(y.year),
      "% Financiados": parseFloat(y.pctFunded),
    })),
    [yearlyFunding],
  );

  // Citation impact comparison
  const impactData = useMemo(() => [
    { name: "Com financiamento", "Média de Citações": avgCitFunded },
    { name: "Sem financiamento", "Média de Citações": avgCitNotFunded },
  ], [avgCitFunded, avgCitNotFunded]);

  const hasFunding = funded > 0;

  if (!hasFunding) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Financiamento"
          description="Análise de agências financiadoras e impacto do financiamento."
        />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <DollarSign className="size-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum dado de financiamento encontrado (campo FU).</p>
            <p className="text-xs mt-1">Verifique se a exportação inclui este campo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financiamento"
        description="Análise de agências financiadoras e impacto do financiamento."
        badge={`${funded} financiados`}
      />

      {/* KPIs */}
      <KpiGrid>
        <KpiCard title="Artigos Financiados" value={funded} icon={<DollarSign className="size-5" />} />
        <KpiCard title="% Financiados" value={`${pctFunded}%`} icon={<BarChart3 className="size-5" />} />
        <KpiCard
          title="Citações Médias (Financ.)"
          value={avgCitFunded}
          icon={<TrendingUp className="size-5" />}
          description={`versus ${avgCitNotFunded} não financiados`}
        />
        <KpiCard title="Agências Distintas" value={agencyCounts.length} icon={<DollarSign className="size-5" />} />
      </KpiGrid>

      <Tabs defaultValue="agencies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agencies">Agências</TabsTrigger>
          <TabsTrigger value="impact">Impacto</TabsTrigger>
          <TabsTrigger value="trend">Tendência</TabsTrigger>
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>

        <TabsContent value="agencies" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Top N:</Label>
            <Slider
              min={5}
              max={Math.min(50, agencyCounts.length)}
              value={[topN]}
              onValueChange={([v]) => setTopN(v)}
              step={5}
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">{topN}</span>
          </div>
          <ChartContainer
            ref={agencyRef}
            title={`Top ${topN} Agências Financiadoras`}
            actions={<ChartExportButton chartRef={agencyRef} fileName="funding-agencies" />}
          >
            <BarChart data={agencyChart} xKey="name" bars={[{ key: "Artigos", label: "Artigos" }]} height={Math.max(400, topN * 28)} layout="vertical" />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <ChartContainer
            ref={impactRef}
            title="Impacto do Financiamento nas Citações"
            description="Média de citações: artigos financiados versus não financiados"
            actions={<ChartExportButton chartRef={impactRef} fileName="funding-impact" />}
          >
            <BarChart data={impactData} xKey="name" bars={[{ key: "Média de Citações", label: "Média de Citações" }]} height={300} />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="trend" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartContainer
              ref={trendRef}
              title="Artigos com Financiamento por Ano"
              actions={<ChartExportButton chartRef={trendRef} fileName="funding-trend" />}
            >
              <BarChart data={trendBarData} xKey="name" bars={[{ key: "Financiados", label: "Financiados" }, { key: "Total", label: "Total" }]} height={350} showLegend />
            </ChartContainer>
            <ChartContainer title="% de Artigos Financiados por Ano">
              <LineChart data={trendLineData} xKey="name" lines={[{ key: "% Financiados", label: "% Financiados" }]} height={350} />
            </ChartContainer>
          </div>
          <DataTable columns={yearCols} data={yearlyFunding} pageSize={15} />
        </TabsContent>

        <TabsContent value="table">
          <DataTable columns={agencyCols} data={agencyTable} pageSize={20} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { authorMetrics, coauthorshipNetwork } from "@/lib/data-processing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { NetworkGraph } from "@/components/charts/network-graph";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ColumnDef } from "@tanstack/react-table";
import type { AuthorMetric } from "@/types/bibliometric";

const columns: ColumnDef<AuthorMetric, unknown>[] = [
  { accessorKey: "name", header: "Autor" },
  { accessorKey: "count", header: "Docs" },
  { accessorKey: "citations", header: "Citações" },
  { accessorKey: "hIndex", header: "h-Index" },
  { accessorKey: "firstYear", header: "1ª Pub." },
  { accessorKey: "lastYear", header: "Últ. Pub." },
];

export default function AutoresPage() {
  const { filtered } = useBib();
  const [topCount, setTopCount] = useState(20);
  const barRef = useChartRef();
  const netRef = useChartRef();

  const metrics = useMemo(() => authorMetrics(filtered), [filtered]);
  const topAuthors = useMemo(() => metrics.slice(0, topCount), [metrics, topCount]);
  const chartData = useMemo(() => topAuthors.map((a) => ({ name: a.name, docs: a.count, citações: a.citations })), [topAuthors]);
  const network = useMemo(() => coauthorshipNetwork(filtered, 30), [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader title="Autores" description="Análise dos autores mais produtivos">
        <TopNSelector value={topCount} onChange={setTopCount} />
      </PageHeader>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Gráfico</TabsTrigger>
          <TabsTrigger value="network">Rede de Coautoria</TabsTrigger>
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>
        <TabsContent value="chart">
          <ChartContainer ref={barRef} title={`Top ${topCount} Autores`} actions={<ChartExportButton chartRef={barRef} fileName="top-autores" />}>
            <BarChart data={chartData} xKey="name" bars={[{ key: "docs", label: "Documentos" }, { key: "citações", label: "Citações" }]} layout="vertical" height={Math.max(350, topCount * 28)} showLegend />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="network">
          <ChartContainer ref={netRef} title="Rede de Coautoria" description="Nós representam autores; arestas indicam coautorias" actions={<ChartExportButton chartRef={netRef} fileName="rede-coautoria" />}>
            {network.nodes.length > 0 ? <NetworkGraph data={network} /> : <EmptyState message="Dados insuficientes para gerar a rede." />}
          </ChartContainer>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardHeader><CardTitle className="text-base">Métricas de Autores</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={columns} data={metrics} searchColumn="name" searchPlaceholder="Buscar autor..." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

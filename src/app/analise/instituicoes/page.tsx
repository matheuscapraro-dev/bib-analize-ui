"use client";

import { useCallback, useMemo, useState } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { countValues, topN, institutionCollaborationNetwork } from "@/lib/data-processing";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { NetworkGraph } from "@/components/charts/network-graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import type { ColumnDef } from "@tanstack/react-table";

interface InstRow { rank: number; name: string; count: number; }

const columns: ColumnDef<InstRow, unknown>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "name", header: "Instituição" },
  { accessorKey: "count", header: "Docs" },
];

export default function InstituicoesPage() {
  const { filtered } = useBib();
  const [topCount, setTopCount] = useState(20);
  const barRef = useChartRef();
  const netRef = useChartRef();
  const { handleDrill, drillDownProps } = useArticleDrillDown(filtered, "C3");

  const allInst = useMemo(() => countValues(filtered, "C3"), [filtered]);
  const top = useMemo(() => topN(allInst, topCount), [allInst, topCount]);
  const chartData = useMemo(() => top.map(([n, v]) => ({ name: n, count: v })), [top]);
  const tableData = useMemo(() => top.map(([n, v], i) => ({ rank: i + 1, name: n, count: v })), [top]);
  const network = useMemo(() => institutionCollaborationNetwork(filtered, 30), [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader title="Instituições" description="Organizações e universidades mais produtivas">
        <TopNSelector value={topCount} onChange={setTopCount} />
      </PageHeader>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Gráfico</TabsTrigger>
          <TabsTrigger value="network">Rede</TabsTrigger>
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>
        <TabsContent value="chart">
          <ChartContainer ref={barRef} title={`Top ${topCount} Instituições`} actions={<ChartExportButton chartRef={barRef} fileName="top-instituicoes" />}>
            <BarChart data={chartData} xKey="name" bars={[{ key: "count", label: "Documentos" }]} layout="vertical" height={Math.max(350, topCount * 25)} onBarClick={(e) => handleDrill(String(e.name))} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="network">
          <ChartContainer ref={netRef} title="Rede de Colaboração Institucional" actions={<ChartExportButton chartRef={netRef} fileName="rede-instituicoes" />}>
            {network.nodes.length > 0 ? <NetworkGraph data={network} /> : <EmptyState />}
          </ChartContainer>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardHeader><CardTitle className="text-base">Ranking de Instituições</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={columns} data={tableData} searchColumn="name" searchPlaceholder="Buscar instituição..." onRowClick={(row) => handleDrill(row.name)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

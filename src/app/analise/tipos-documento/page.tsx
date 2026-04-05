"use client";

import { useCallback, useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { PieChart } from "@/components/charts/pie-chart";
import { Treemap } from "@/components/charts/treemap";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { countValues, topN } from "@/lib/data-processing";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ColumnDef } from "@tanstack/react-table";

interface TypeRow { type: string; count: number; pct: string; }

const columns: ColumnDef<TypeRow, unknown>[] = [
  { accessorKey: "type", header: "Tipo" },
  { accessorKey: "count", header: "Documentos" },
  { accessorKey: "pct", header: "%" },
];

export default function TiposDocumentoPage() {
  const { filtered } = useBib();
  const pieRef = useChartRef();
  const treeRef = useChartRef();
  const { handleDrill, drillDownProps } = useArticleDrillDown(filtered, "DT");

  const typeCounts = useMemo(() => countValues(filtered, "DT"), [filtered]);
  const top = useMemo(() => topN(typeCounts, 20), [typeCounts]);
  const pieData = useMemo(() => top.map(([n, v]) => ({ name: n, value: v })), [top]);
  const treeData = useMemo(() => top.map(([name, value]) => ({ name, value })), [top]);
  const tableData = useMemo(() => top.map(([n, v]) => ({
    type: n, count: v, pct: ((v / filtered.length) * 100).toFixed(1) + "%",
  })), [top, filtered.length]);

  return (
    <div className="space-y-6">
      <PageHeader title="Tipos de Documento" description="Distribuição por tipo de publicação" badge={`${typeCounts.size} tipos`} />

      <Tabs defaultValue="pie">
        <TabsList>
          <TabsTrigger value="pie">Setores</TabsTrigger>
          <TabsTrigger value="treemap">Treemap</TabsTrigger>
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>
        <TabsContent value="pie">
          <ChartContainer ref={pieRef} title="Tipos de Documento" actions={<ChartExportButton chartRef={pieRef} fileName="tipos-doc-pie" />}>
            <PieChart data={pieData} innerRadius={60} onSliceClick={(e) => handleDrill(e.name)} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="treemap">
          <ChartContainer ref={treeRef} title="Treemap de Tipos" actions={<ChartExportButton chartRef={treeRef} fileName="tipos-doc-treemap" />}>
            <Treemap data={treeData} onCellClick={(e) => handleDrill(e.name)} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardHeader><CardTitle className="text-base">Todos os Tipos</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={columns} data={tableData} onRowClick={(row) => handleDrill(row.type)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

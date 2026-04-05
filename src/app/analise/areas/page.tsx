"use client";

import { useCallback, useMemo, useState } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { Treemap } from "@/components/charts/treemap";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { countValues, topN } from "@/lib/data-processing";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { TopNSelector } from "@/components/top-n-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ColumnDef } from "@tanstack/react-table";

interface AreaRow { rank: number; area: string; count: number; }

const columns: ColumnDef<AreaRow, unknown>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "area", header: "Área" },
  { accessorKey: "count", header: "Documentos" },
];

export default function AreasPage() {
  const { filtered } = useBib();
  const [field, setField] = useState<"WC" | "SC">("WC");
  const [topCount, setTopCount] = useState(20);
  const treeRef = useChartRef();
  const barRef = useChartRef();
  const { handleDrill, drillDownProps } = useArticleDrillDown(filtered, field);

  const areaCounts = useMemo(() => countValues(filtered, field), [filtered, field]);
  const top = useMemo(() => topN(areaCounts, topCount), [areaCounts, topCount]);
  const treeData = useMemo(() => top.map(([name, value]) => ({ name, value })), [top]);
  const barData = useMemo(() => top.map(([n, v]) => ({ area: n, count: v })), [top]);
  const tableData = useMemo(() => [...areaCounts.entries()].sort((a, b) => b[1] - a[1]).map(([n, v], i) => ({
    rank: i + 1, area: n, count: v,
  })), [areaCounts]);

  return (
    <div className="space-y-6">
      <PageHeader title="Áreas do Conhecimento" description="Distribuição temática" badge={`${areaCounts.size} áreas`}>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Campo</Label>
          <Select value={field} onValueChange={(v) => setField(v as "WC" | "SC")}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="WC">Subcategorias (WC)</SelectItem>
              <SelectItem value="SC">Categorias (SC)</SelectItem>
            </SelectContent>
          </Select>
          <TopNSelector value={topCount} onChange={setTopCount} />
        </div>
      </PageHeader>

      <Tabs defaultValue="treemap">
        <TabsList>
          <TabsTrigger value="treemap">Treemap</TabsTrigger>
          <TabsTrigger value="bar">Gráfico</TabsTrigger>
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>
        <TabsContent value="treemap">
          <ChartContainer ref={treeRef} title={`Top ${topCount} Áreas`} actions={<ChartExportButton chartRef={treeRef} fileName="areas-treemap" />}>
            <Treemap data={treeData} height={400} onCellClick={(e) => handleDrill(e.name)} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="bar">
          <ChartContainer ref={barRef} title={`Top ${topCount} Áreas`} actions={<ChartExportButton chartRef={barRef} fileName="areas-bar" />}>
            <BarChart data={barData} xKey="area" bars={[{ key: "count", label: "Documentos" }]} layout="vertical" height={Math.max(350, topCount * 25)} onBarClick={(e) => handleDrill(String(e.area))} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardHeader><CardTitle className="text-base">Todas as Áreas</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={columns} data={tableData} searchColumn="area" searchPlaceholder="Buscar área..." onRowClick={(row) => handleDrill(row.area)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

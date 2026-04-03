"use client";

import { useMemo, useState } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { ChoroplethMap } from "@/components/charts/choropleth-map";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { countValues, topN, countryCollaborationNetwork, globalSouthStats } from "@/lib/data-processing";
import { extractCountries } from "@/lib/data-processing";
import { NetworkGraph } from "@/components/charts/network-graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, TrendingUp, MapPin } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface CountryRow { rank: number; name: string; count: number; }

const columns: ColumnDef<CountryRow, unknown>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "name", header: "País" },
  { accessorKey: "count", header: "Docs" },
];

export default function PaisesPage() {
  const { filtered } = useBib();
  const mapRef = useChartRef();
  const barRef = useChartRef();
  const netRef = useChartRef();
  const gsPieRef = useChartRef();
  const contPieRef = useChartRef();
  const contBarRef = useChartRef();

  const allCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { país } of extractCountries(filtered)) {
      counts.set(país, (counts.get(país) ?? 0) + 1);
    }
    return counts;
  }, [filtered]);

  const sorted = useMemo(() => [...allCountries.entries()].sort((a, b) => b[1] - a[1]), [allCountries]);
  const top20 = useMemo(() => sorted.slice(0, 20).map(([n, v]) => ({ name: n, count: v })), [sorted]);
  const tableData = useMemo(() => sorted.map(([n, v], i) => ({ rank: i + 1, name: n, count: v })), [sorted]);
  const mapData = useMemo(() => Object.fromEntries(allCountries), [allCountries]);
  const network = useMemo(() => countryCollaborationNetwork(filtered, 30), [filtered]);

  const gs = useMemo(() => globalSouthStats(filtered), [filtered]);
  const gsData = useMemo(() => [
    { name: "Sul Global", value: gs.southDocs },
    { name: "Norte Global", value: gs.northDocs },
  ].filter((d) => d.value > 0), [gs]);
  const hasGs = gs.southDocs + gs.northDocs > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Países" description="Distribuição geográfica da produção científica" badge={`${allCountries.size} países`} />

      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">Mapa</TabsTrigger>
          <TabsTrigger value="chart">Gráfico</TabsTrigger>
          <TabsTrigger value="network">Rede</TabsTrigger>
          {hasGs && <TabsTrigger value="globalsouth" className="gap-1"><Globe className="size-3.5" />Sul Global</TabsTrigger>}
          {gs.continents.length > 0 && <TabsTrigger value="continents" className="gap-1"><MapPin className="size-3.5" />Continentes</TabsTrigger>}
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>
        <TabsContent value="map">
          <ChartContainer ref={mapRef} title="Mapa de Produção por País" actions={<ChartExportButton chartRef={mapRef} fileName="mapa-paises" />}>
            <ChoroplethMap data={mapData} height={450} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="chart">
          <ChartContainer ref={barRef} title="Top 20 Países" actions={<ChartExportButton chartRef={barRef} fileName="top-paises" />}>
            <BarChart data={top20} xKey="name" bars={[{ key: "count", label: "Documentos" }]} layout="vertical" height={500} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="network">
          <ChartContainer ref={netRef} title="Rede de Colaboração entre Países" actions={<ChartExportButton chartRef={netRef} fileName="rede-paises" />}>
            {network.nodes.length > 0 ? <NetworkGraph data={network} /> : <EmptyState />}
          </ChartContainer>
        </TabsContent>

        {/* Global South Tab */}
        {hasGs && (
          <TabsContent value="globalsouth" className="space-y-4">
            <KpiGrid>
              <KpiCard title="Sul Global" value={gs.southDocs} icon={<Globe className="size-5" />} description={`${gs.southPct}% dos docs`} />
              <KpiCard title="Norte Global" value={gs.northDocs} icon={<Globe className="size-5" />} />
              <KpiCard title="Gap de Citação" value={gs.citationGap.toFixed(1)} icon={<TrendingUp className="size-5" />} description="Média Norte − Sul" />
            </KpiGrid>
            <ChartContainer ref={gsPieRef} title="Sul Global vs Norte Global" actions={<ChartExportButton chartRef={gsPieRef} fileName="global-south" />}>
              <PieChart data={gsData} innerRadius={60} />
            </ChartContainer>
          </TabsContent>
        )}

        {/* Continents Tab */}
        {gs.continents.length > 0 && (
          <TabsContent value="continents" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartContainer ref={contPieRef} title="Distribuição por Continente" actions={<ChartExportButton chartRef={contPieRef} fileName="continentes-pie" />}>
                <PieChart data={gs.continents.map((c) => ({ name: c.name, value: c.count }))} innerRadius={60} />
              </ChartContainer>
              <ChartContainer ref={contBarRef} title="Documentos por Continente" actions={<ChartExportButton chartRef={contBarRef} fileName="continentes-bar" />}>
                <BarChart data={gs.continents.map(c => ({ name: c.name, count: c.count }))} xKey="name" bars={[{ key: "count", label: "Documentos" }]} layout="vertical" height={300} />
              </ChartContainer>
            </div>
          </TabsContent>
        )}

        <TabsContent value="table">
          <Card>
            <CardHeader><CardTitle className="text-base">Todos os Países</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={columns} data={tableData} searchColumn="name" searchPlaceholder="Buscar país..." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

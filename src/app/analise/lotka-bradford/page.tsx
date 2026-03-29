"use client";

import { useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { LineChart } from "@/components/charts/line-chart";
import { ScatterChart } from "@/components/charts/scatter-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { lotkaLaw, bradfordLaw } from "@/lib/data-processing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ColumnDef } from "@tanstack/react-table";

interface BradfordRow { zone: number; sources: number; articles: number; }

const bradfordCols: ColumnDef<BradfordRow, unknown>[] = [
  { accessorKey: "zone", header: "Zona" },
  { accessorKey: "sources", header: "Fontes" },
  { accessorKey: "articles", header: "Artigos" },
];

export default function LotkaBradfordPage() {
  const { filtered } = useBib();
  const lotkaRef = useChartRef();
  const bradfordRef = useChartRef();

  const lotka = useMemo(() => lotkaLaw(filtered), [filtered]);
  const bradford = useMemo(() => bradfordLaw(filtered), [filtered]);

  const lotkaChart = useMemo(() =>
    lotka.observed.map((o, i) => ({
      docs: o.docs,
      observado: o.authors,
      esperado: lotka.expected[i]?.authors ?? 0,
    })), [lotka]);

  const bradfordChart = useMemo(() =>
    bradford.zones.map((z, i) => ({
      zone: `Zona ${i + 1}`,
      fontes: z.sources,
      artigos: z.articles,
    })), [bradford]);

  const bradfordTable = useMemo(() =>
    bradford.zones.map((z, i) => ({
      zone: i + 1,
      sources: z.sources,
      articles: z.articles,
    })), [bradford]);

  return (
    <div className="space-y-6">
      <PageHeader title="Lotka & Bradford" description="Leis bibliométricas clássicas" />

      <Tabs defaultValue="lotka">
        <TabsList>
          <TabsTrigger value="lotka">Lei de Lotka</TabsTrigger>
          <TabsTrigger value="bradford">Lei de Bradford</TabsTrigger>
        </TabsList>

        <TabsContent value="lotka" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lei de Lotka</CardTitle>
              <CardDescription>
                Relação inversa entre o número de autores e sua produtividade. O expoente n estimado é: <strong>{lotka.exponent.toFixed(2)}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer ref={lotkaRef} title="Distribuição de Lotka" description="Observado vs Esperado" actions={<ChartExportButton chartRef={lotkaRef} fileName="lotka" />}>
                <LineChart
                  data={lotkaChart}
                  xKey="docs"
                  lines={[
                    { key: "observado", label: "Observado" },
                    { key: "esperado", label: "Esperado (Lotka)", dashed: true },
                  ]}
                  showLegend
                />
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bradford" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lei de Bradford</CardTitle>
              <CardDescription>
                Distribuição de artigos por zonas de produtividade das fontes. O núcleo contém as {bradford.zones[0]?.sources ?? 0} fontes mais produtivas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChartContainer ref={bradfordRef} title="Zonas de Bradford" actions={<ChartExportButton chartRef={bradfordRef} fileName="bradford" />}>
                <BarChart
                  data={bradfordChart}
                  xKey="zone"
                  bars={[
                    { key: "fontes", label: "Fontes" },
                    { key: "artigos", label: "Artigos" },
                  ]}
                  showLegend
                />
              </ChartContainer>
              <DataTable columns={bradfordCols} data={bradfordTable} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

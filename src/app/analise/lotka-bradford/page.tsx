"use client";

import { useRef, useMemo, useCallback } from "react";
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
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import type { ColumnDef } from "@tanstack/react-table";
import type { BibWork } from "@/types/bibliometric";

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

  const filterModeRef = useRef<"lotka" | "bradford">("lotka");
  const { handleDrill, drillDownProps } = useArticleDrillDown(filtered, (data: BibWork[], value: string) => {
    if (filterModeRef.current === "lotka") {
      const numDocs = Number(value);
      const authorCounts = new Map<string, number>();
      for (const w of data) {
        for (const a of (w.AU ?? "").split("; ").filter(Boolean)) {
          const t = a.trim();
          authorCounts.set(t, (authorCounts.get(t) ?? 0) + 1);
        }
      }
      const target = new Set([...authorCounts.entries()].filter(([, c]) => c === numDocs).map(([a]) => a));
      return data.filter(w => (w.AU ?? "").split("; ").some(a => target.has(a.trim())));
    }
    // bradford
    const zoneNum = parseInt(value.replace(/\D/g, ""), 10) - 1;
    const counts = new Map<string, number>();
    for (const w of data) { const s = (w.SO ?? "").trim(); if (s) counts.set(s, (counts.get(s) ?? 0) + 1); }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, c]) => s + c, 0);
    const third = total / 3;
    let accum = 0;
    const zoneMap = new Map<string, number>();
    for (const [source, articles] of sorted) { accum += articles; zoneMap.set(source, accum <= third ? 0 : accum <= 2 * third ? 1 : 2); }
    return data.filter(w => zoneMap.get((w.SO ?? "").trim()) === zoneNum);
  });
  const lotkaHandler = useCallback((entry: Record<string, unknown>) => {
    filterModeRef.current = "lotka";
    handleDrill(String(entry.docs));
  }, [handleDrill]);
  const bradfordHandler = useCallback((name: string) => {
    filterModeRef.current = "bradford";
    handleDrill(name);
  }, [handleDrill]);

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
                  onDotClick={lotkaHandler}
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
                  onBarClick={(e) => bradfordHandler(String(e.zone))}
                />
              </ChartContainer>
              <DataTable columns={bradfordCols} data={bradfordTable} onRowClick={(row) => bradfordHandler(`Zona ${row.zone}`)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

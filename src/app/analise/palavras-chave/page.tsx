"use client";

import { useCallback, useMemo, useState } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { WordCloud } from "@/components/charts/word-cloud";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { keywordCooccurrenceNetwork, extractKeywords, keywordTimeline } from "@/lib/data-processing";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useArticleDrillDown } from "@/hooks/use-drill-down";
import { NetworkGraph } from "@/components/charts/network-graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ColumnDef } from "@tanstack/react-table";

interface KwRow { rank: number; keyword: string; count: number; }

const columns: ColumnDef<KwRow, unknown>[] = [
  { accessorKey: "rank", header: "#" },
  { accessorKey: "keyword", header: "Palavra-chave" },
  { accessorKey: "count", header: "Frequência" },
];

export default function PalavrasChavePage() {
  const { filtered } = useBib();
  const [kwField, setKwField] = useState<"DE" | "ID">("DE");
  const [topCount, setTopCount] = useState(30);
  const barRef = useChartRef();
  const cloudRef = useChartRef();
  const netRef = useChartRef();
  const { handleDrill, drillDownProps } = useArticleDrillDown(filtered, kwField);

  const allKw = useMemo(() => {
    const allKeywords = extractKeywords(filtered, kwField);
    const counts = new Map<string, number>();
    for (const k of allKeywords) {
      const norm = k.toLowerCase().trim();
      if (norm) counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered, kwField]);

  const top = useMemo(() => allKw.slice(0, topCount), [allKw, topCount]);
  const chartData = useMemo(() => top.map(([n, v]) => ({ keyword: n, count: v })), [top]);
  const cloudWords = useMemo(() => allKw.slice(0, 80).map(([text, value]) => ({ text, value })), [allKw]);
  const tableData = useMemo(() => allKw.map(([n, v], i) => ({ rank: i + 1, keyword: n, count: v })), [allKw]);
  const network = useMemo(() => keywordCooccurrenceNetwork(filtered, kwField, 5, 30), [filtered, kwField]);
  const timeline = useMemo(() => keywordTimeline(filtered, kwField, 15), [filtered, kwField]);

  return (
    <div className="space-y-6">
      <PageHeader title="Palavras-chave" description="Termos mais frequentes" badge={`${allKw.length} termos`}>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Campo</Label>
          <Select value={kwField} onValueChange={(v) => setKwField(v as "DE" | "ID")}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DE">Autor (DE)</SelectItem>
              <SelectItem value="ID">Indexadas (ID)</SelectItem>
            </SelectContent>
          </Select>
          <TopNSelector value={topCount} onChange={setTopCount} />
        </div>
      </PageHeader>

      <Tabs defaultValue="cloud">
        <TabsList>
          <TabsTrigger value="cloud">Nuvem</TabsTrigger>
          <TabsTrigger value="chart">Gráfico</TabsTrigger>
          <TabsTrigger value="network">Rede</TabsTrigger>
          {timeline.years.length > 1 && <TabsTrigger value="evolution">Evolução</TabsTrigger>}
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>
        <TabsContent value="cloud">
          <ChartContainer ref={cloudRef} title="Nuvem de Palavras-chave" actions={<ChartExportButton chartRef={cloudRef} fileName="nuvem-palavras" />}>
            <WordCloud words={cloudWords} height={400} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="chart">
          <ChartContainer ref={barRef} title={`Top ${topCount} Palavras-chave`} actions={<ChartExportButton chartRef={barRef} fileName="top-keywords" />}>
            <BarChart data={chartData} xKey="keyword" bars={[{ key: "count", label: "Frequência" }]} layout="vertical" height={Math.max(350, topCount * 25)} onBarClick={(e) => handleDrill(String(e.keyword))} />
          </ChartContainer>
        </TabsContent>
        <TabsContent value="network">
          <ChartContainer ref={netRef} title="Rede de Coocorrência" actions={<ChartExportButton chartRef={netRef} fileName="rede-keywords" />}>
            {network.nodes.length > 0 ? <NetworkGraph data={network} /> : <EmptyState />}
          </ChartContainer>
        </TabsContent>
        {timeline.years.length > 1 && (
          <TabsContent value="evolution">
            <Card>
              <CardHeader><CardTitle className="text-base">Evolução Temporal — Top 15 Palavras-chave</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 sticky left-0 bg-background font-medium">Palavra-chave</th>
                        {timeline.years.map((y) => (
                          <th key={y} className="text-center p-2 font-medium min-w-[50px]">{y}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.rows.map((row) => (
                        <tr key={row.keyword} className="border-b hover:bg-muted/50">
                          <td className="p-2 sticky left-0 bg-background font-medium truncate max-w-[200px]">{row.keyword}</td>
                          {timeline.years.map((y) => {
                            const v = (row[String(y)] as number) || 0;
                            const max = Math.max(...timeline.years.map((yr) => (row[String(yr)] as number) || 0));
                            const intensity = max > 0 ? v / max : 0;
                            return (
                              <td
                                key={y}
                                className="text-center p-2"
                                style={{
                                  backgroundColor: v > 0 ? `hsl(217 91% 60% / ${0.15 + intensity * 0.65})` : "transparent",
                                  color: intensity > 0.5 ? "white" : undefined,
                                }}
                              >
                                {v > 0 ? v : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="table">
          <Card>
            <CardHeader><CardTitle className="text-base">Todas as Palavras-chave</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={columns} data={tableData} searchColumn="keyword" searchPlaceholder="Buscar palavra-chave..." onRowClick={(row) => handleDrill(row.keyword)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

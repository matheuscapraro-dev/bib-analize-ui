"use client";

import { useMemo } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Users, Newspaper } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { pctDelta } from "@/lib/comparison/utils";
import {
  computeLotkaComparison,
  computeBradfordComparison,
} from "@/lib/comparison/analyses";

export default function ProgramasLotkaBradfordPage() {
  const { programs, isReady } = usePrograms();

  const lotka = useMemo(
    () => (isReady ? computeLotkaComparison(programs) : []),
    [programs, isReady],
  );

  const bradford = useMemo(
    () => (isReady ? computeBradfordComparison(programs) : []),
    [programs, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Lotka & Bradford" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<BookOpen className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leis de Lotka & Bradford"
        description="Comparação das leis bibliométricas de produtividade de autores (Lotka) e concentração de periódicos (Bradford) entre programas."
        badge="Programas"
      />

      <Tabs defaultValue="lotka">
        <TabsList>
          <TabsTrigger value="lotka" className="gap-1.5">
            <Users className="size-3.5" />
            Lei de Lotka
          </TabsTrigger>
          <TabsTrigger value="bradford" className="gap-1.5">
            <Newspaper className="size-3.5" />
            Lei de Bradford
          </TabsTrigger>
        </TabsList>

        {/* Lotka Tab */}
        <TabsContent value="lotka" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4" />
                Produtividade de Autores — Lei de Lotka
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                A Lei de Lotka descreve a distribuição de produtividade científica: poucos autores
                são altamente produtivos enquanto a maioria publica poucos trabalhos. O expoente
                teórico é ≈2,0.
              </p>

              {/* Lotka Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                      {lotka.map((l) => (
                        <th key={l.datasetId} className="text-right py-2 px-3 font-medium">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                            <span className="truncate max-w-[120px]">{l.datasetName}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2.5 pr-4 text-muted-foreground">Expoente de Lotka</td>
                      {lotka.map((l, i) => {
                        const delta = i > 0 ? pctDelta(l.lotka.exponent, lotka[0].lotka.exponent) : null;
                        return (
                          <td key={l.datasetId} className="text-right py-2.5 px-3 tabular-nums font-medium">
                            {l.lotka.exponent.toFixed(2)}
                            {delta !== null && delta !== 0 && (
                              <span className={`text-xs ml-1 ${delta > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                {delta > 0 ? "+" : ""}{delta}%
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2.5 pr-4 text-muted-foreground">Total de Autores</td>
                      {lotka.map((l) => (
                        <td key={l.datasetId} className="text-right py-2.5 px-3 tabular-nums font-medium">
                          {formatNumber(l.lotka.totalAuthors)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        Autores do Núcleo
                        <span className="text-xs text-muted-foreground/70 ml-1">(alta produtividade)</span>
                      </td>
                      {lotka.map((l) => (
                        <td key={l.datasetId} className="text-right py-2.5 px-3 tabular-nums font-medium">
                          {formatNumber(l.lotka.coreCount)}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({l.lotka.totalAuthors > 0
                              ? ((l.lotka.coreCount / l.lotka.totalAuthors) * 100).toFixed(1)
                              : 0}%)
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Lotka Distribution per Program */}
          <ChartContainer
            title="Distribuição de Produtividade"
            description="Número de autores por quantidade de publicações (observado vs. esperado pela Lei de Lotka)."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {lotka.map((l) => (
                <Card key={l.datasetId}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: l.color }} />
                      <p className="text-sm font-medium truncate">{l.datasetName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expoente: <strong>{l.lotka.exponent.toFixed(2)}</strong>
                    </p>
                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {l.lotka.observed.slice(0, 10).map((o) => (
                        <div key={o.docs} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{o.docs} pub{o.docs > 1 ? "s" : ""}</span>
                          <span className="tabular-nums">
                            {o.authors} autores
                            <span className="text-muted-foreground/60 ml-1">
                              (esp. {l.lotka.expected.find((e) => e.docs === o.docs)?.authors ?? "–"})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ChartContainer>
        </TabsContent>

        {/* Bradford Tab */}
        <TabsContent value="bradford" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Newspaper className="size-4" />
                Zonas de Bradford
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                A Lei de Bradford divide periódicos em 3 zonas de concentração: um pequeno núcleo
                (Zona 1) produz ~1/3 dos artigos, enquanto zonas periféricas precisam de muito
                mais periódicos para cobrir a mesma proporção.
              </p>
            </CardContent>
          </Card>

          <ChartContainer
            title="Detalhes das Zonas"
            description="Distribuição de periódicos e artigos nas 3 zonas de Bradford para cada programa."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bradford.map((b) => (
                <Card key={b.datasetId}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: b.color }} />
                      <p className="text-sm font-medium truncate">{b.datasetName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatNumber(b.bradford.totalJournals)} periódicos</p>
                    {b.bradford.zones.map((z, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-medium">Zona {i + 1}</span>
                          <span className="tabular-nums font-medium">
                            {z.sources} fontes &bull; {z.articles} art.
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${b.bradford.totalJournals > 0 ? (z.sources / b.bradford.totalJournals) * 100 : 0}%`,
                              backgroundColor: b.color,
                              opacity: 1 - i * 0.25,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ChartContainer>

          {/* Bradford Comparison Table */}
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Programa</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total Periódicos</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Zona 1 (núcleo)</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Zona 2</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Zona 3 (periferia)</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Razão Z2/Z1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bradford.map((b) => {
                      const z = b.bradford.zones;
                      const ratio = z[0]?.sources > 0 ? (z[1]?.sources / z[0]?.sources).toFixed(1) : "–";
                      return (
                        <tr key={b.datasetId} className="border-b last:border-0">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                              <span className="font-medium truncate max-w-[120px]">{b.datasetName}</span>
                            </div>
                          </td>
                          <td className="text-right py-2.5 px-3 tabular-nums">{formatNumber(b.bradford.totalJournals)}</td>
                          {z.map((zone, i) => (
                            <td key={i} className="text-right py-2.5 px-3 tabular-nums">
                              {zone.sources} <span className="text-muted-foreground">/ {zone.articles} art.</span>
                            </td>
                          ))}
                          <td className="text-right py-2.5 px-3 tabular-nums font-medium">
                            {ratio}×
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

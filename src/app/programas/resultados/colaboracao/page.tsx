"use client";

import { useMemo, useState } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { OverlapDisplay } from "@/components/comparison/overlap-display";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { ArticleDrillDown } from "@/components/article-drill-down";
import { useProgramDrillDown } from "@/hooks/use-drill-down";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Network, Building2, Users2, GitFork } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { pctDelta } from "@/lib/comparison/utils";
import {
  computeCollaborationIntensity,
  computeInstitutionOverlap,
  computeTopInstitutionsComparison,
  computeCrossProgramAuthors,
} from "@/lib/comparison/analyses";

export default function ProgramasColaboracaoPage() {
  const { programs, isReady } = usePrograms();
  const [topN, setTopN] = useState(20);
  const { handleDrill, drillDownProps } = useProgramDrillDown(programs, "C3");

  const collaboration = useMemo(
    () => (isReady ? computeCollaborationIntensity(programs) : []),
    [programs, isReady],
  );

  const instOverlap = useMemo(
    () => (isReady ? computeInstitutionOverlap(programs) : null),
    [programs, isReady],
  );

  const topInstitutions = useMemo(
    () => (isReady ? computeTopInstitutionsComparison(programs, topN) : []),
    [programs, isReady, topN],
  );

  const crossAuthors = useMemo(
    () => (isReady ? computeCrossProgramAuthors(programs) : []),
    [programs, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Colaboração & Redes" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<Network className="size-10" />} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colaboração & Redes"
        description="Intensidade de colaboração, instituições parceiras e autores compartilhados entre programas."
        badge="Programas"
      />

      {/* Collaboration Intensity Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitFork className="size-4" />
            Intensidade de Colaboração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                  {programs.map((p) => (
                    <th key={p.id} className="text-right py-2 px-3 font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: p.colorHex }} />
                        <span className="truncate max-w-[120px]">{p.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collaboration.map((row) => (
                  <tr key={row.metric} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 text-muted-foreground">{row.metric}</td>
                    {programs.map((p, i) => {
                      const val = row[p.id] as number;
                      const first = row[programs[0].id] as number;
                      const delta = i > 0 ? pctDelta(val, first) : null;
                      return (
                        <td key={p.id} className="text-right py-2.5 px-3 tabular-nums font-medium">
                          {typeof val === "number" && val % 1 !== 0 ? val.toFixed(2) : val}
                          {row.metric.includes("%") ? "%" : ""}
                          {delta !== null && delta !== 0 && (
                            <span className={`text-xs ml-1 ${delta > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {delta > 0 ? "+" : ""}{delta}%
                            </span>
                          )}
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

      <Separator />

      <Tabs defaultValue="instituicoes">
        <TabsList>
          <TabsTrigger value="instituicoes" className="gap-1.5">
            <Building2 className="size-3.5" />
            Instituições
          </TabsTrigger>
          <TabsTrigger value="overlap" className="gap-1.5">
            <Network className="size-3.5" />
            Sobreposição
          </TabsTrigger>
          <TabsTrigger value="autores" className="gap-1.5">
            <Users2 className="size-3.5" />
            Autores Compartilhados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instituicoes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} />
          </div>
          <ChartContainer
            title={`Top ${topN} Instituições`}
            description="Instituições com mais publicações em cada programa."
          >
            <ComparisonBarChart
              data={topInstitutions}
              categoryKey="name"
              datasets={programs}
              height={Math.max(400, topN * 28)}
              layout="vertical"
              onBarClick={(e, dsId) => handleDrill(String(e.name), dsId)}
            />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="overlap" className="mt-4">
          {instOverlap && (
            <ChartContainer
              title="Sobreposição de Instituições"
              description="Instituições compartilhadas e exclusivas entre os programas."
            >
              <OverlapDisplay result={instOverlap} datasets={programs} label="instituições" />
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="autores" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users2 className="size-4" />
                Autores que Publicam em Múltiplos Programas
                {crossAuthors.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {crossAuthors.length} autores
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {crossAuthors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum autor publica em mais de um programa.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Autor</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Programas</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Documentos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crossAuthors.slice(0, 50).map((a) => (
                        <tr key={a.name} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 pr-4 font-medium">{a.name}</td>
                          <td className="text-right py-2 px-3">
                            <div className="flex flex-wrap justify-end gap-1">
                              {a.programs.map((p) => (
                                <Badge key={p} variant="outline" className="text-xs">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="text-right py-2 px-3 tabular-nums">{formatNumber(a.totalDocs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {crossAuthors.length > 50 && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Exibindo 50 de {crossAuthors.length} autores compartilhados.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ArticleDrillDown {...drillDownProps} />
    </div>
  );
}

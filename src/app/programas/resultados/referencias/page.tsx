"use client";

import { useMemo, useState } from "react";
import { usePrograms } from "@/store/program-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { OverlapDisplay } from "@/components/comparison/overlap-display";
import { TopNSelector } from "@/components/top-n-selector";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Network, List } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  computeTopReferencesComparison,
  computeReferenceOverlap,
} from "@/lib/comparison/analyses";

export default function ProgramasReferenciasPage() {
  const { programs, isReady } = usePrograms();
  const [topN, setTopN] = useState(20);

  const topRefs = useMemo(
    () => (isReady ? computeTopReferencesComparison(programs, topN) : []),
    [programs, isReady, topN],
  );

  const refOverlap = useMemo(
    () => (isReady ? computeReferenceOverlap(programs) : null),
    [programs, isReady],
  );

  if (!isReady) {
    return (
      <div>
        <PageHeader title="Referências" badge="Programas" />
        <EmptyState message="Carregando dados dos programas..." icon={<BookMarked className="size-10" />} />
      </div>
    );
  }

  // Check if any program has reference data
  const hasRefData = programs.some((p) => p.works.some((w) => w.CR && w.CR.length > 0));

  if (!hasRefData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Base Intelectual"
          description="Referências mais citadas e sobreposição da base intelectual entre programas."
          badge="Programas"
        />
        <EmptyState
          message="Os dados não contêm o campo de referências citadas (CR). Essa análise requer dados exportados com referências."
          icon={<BookMarked className="size-10" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Base Intelectual"
        description="Referências mais citadas e sobreposição da base intelectual entre programas."
        badge="Programas"
      />

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking" className="gap-1.5">
            <List className="size-3.5" />
            Referências mais citadas
          </TabsTrigger>
          <TabsTrigger value="overlap" className="gap-1.5">
            <Network className="size-3.5" />
            Sobreposição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <TopNSelector value={topN} onChange={setTopN} options={[10, 20, 30, 50]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {topRefs.map((tr) => (
              <Card key={tr.datasetId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: tr.color }} />
                    <span className="truncate">{tr.datasetName}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Top {topN}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tr.references.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sem dados de referências.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {tr.references.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 py-1.5 border-b last:border-0"
                        >
                          <span className="text-xs text-muted-foreground tabular-nums w-6 shrink-0 text-right pt-0.5">
                            {i + 1}.
                          </span>
                          <p className="text-xs leading-relaxed flex-1 break-words">{r.ref}</p>
                          <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
                            {r.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="overlap" className="mt-4">
          {refOverlap && (
            <ChartContainer
              title="Sobreposição de Referências Citadas"
              description="Referências compartilhadas e exclusivas entre os programas."
            >
              <OverlapDisplay result={refOverlap} datasets={programs} label="referências" />
            </ChartContainer>
          )}

          {refOverlap && refOverlap.shared.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookMarked className="size-4" />
                  Referências Compartilhadas
                  <Badge variant="secondary" className="ml-2">
                    {formatNumber(refOverlap.shared.length)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {refOverlap.shared.slice(0, 50).map((ref, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 py-1.5 border-b last:border-0"
                    >
                      <span className="text-xs text-muted-foreground tabular-nums w-6 shrink-0 text-right pt-0.5">
                        {i + 1}.
                      </span>
                      <p className="text-xs leading-relaxed break-words">{ref}</p>
                    </div>
                  ))}
                  {refOverlap.shared.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Exibindo 50 de {formatNumber(refOverlap.shared.length)} referências compartilhadas.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

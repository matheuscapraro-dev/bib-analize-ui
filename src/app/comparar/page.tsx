"use client";

import { useMemo } from "react";
import { useComparison } from "@/store/comparison-context";
import { DatasetSelector } from "@/components/comparison/dataset-selector";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { RadarChart } from "@/components/charts/radar-chart";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/utils";
import { pctDelta } from "@/lib/comparison/utils";
import { computeKpiComparison, computeRadarProfile } from "@/lib/comparison/analyses";
import {
  FileText,
  Users,
  Newspaper,
  TrendingUp,
  BarChart3,
  GitCompareArrows,
} from "lucide-react";

export default function CompararPage() {
  const { datasets, isReady } = useComparison();

  const kpis = useMemo(
    () => (isReady ? computeKpiComparison(datasets) : []),
    [datasets, isReady],
  );

  const radar = useMemo(
    () => (isReady ? computeRadarProfile(datasets) : []),
    [datasets, isReady],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comparação de Análises"
        description="Selecione 2 a 4 análises salvas para comparar métricas, tendências e distribuições."
        badge="Comparar"
      />

      {/* Dataset selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompareArrows className="size-4" />
            Selecionar Datasets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DatasetSelector />
        </CardContent>
      </Card>

      {!isReady && (
        <div className="text-center py-12 text-muted-foreground">
          <GitCompareArrows className="size-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Selecione pelo menos 2 análises para começar</p>
          <p className="text-sm mt-1">As análises comparativas aparecerão aqui e nas subpáginas da barra lateral.</p>
        </div>
      )}

      {isReady && (
        <>
          <Separator />

          {/* KPI Comparison */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Métricas Gerais
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                    {kpis.map((k) => (
                      <th key={k.datasetId} className="text-right py-2 px-3 font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: k.color }}
                          />
                          <span className="truncate max-w-[120px]">{k.datasetName}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <KpiRow label="Documentos" icon={<FileText className="size-3.5" />} values={kpis.map((k) => k.kpis.totalWorks)} />
                  <KpiRow label="Autores únicos" icon={<Users className="size-3.5" />} values={kpis.map((k) => k.kpis.uniqueAuthors)} />
                  <KpiRow label="Fontes" icon={<Newspaper className="size-3.5" />} values={kpis.map((k) => k.kpis.uniqueSources)} />
                  <KpiRow label="Citações totais" icon={<TrendingUp className="size-3.5" />} values={kpis.map((k) => k.kpis.totalCitations)} />
                  <KpiRow label="Média de citações/doc." icon={<BarChart3 className="size-3.5" />} values={kpis.map((k) => k.kpis.meanCitations)} decimal />
                  <KpiRow
                    label="Período"
                    icon={<BarChart3 className="size-3.5" />}
                    textValues={kpis.map((k) => `${k.kpis.yearRange[0]}–${k.kpis.yearRange[1]}`)}
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Radar Profile */}
          <ChartContainer
            title="Perfil Comparativo"
            description="Dimensões normalizadas (0-100) para cada dataset. Quanto maior a área, mais abrangente o perfil."
          >
            <RadarChart
              data={radar}
              dimensionKey="dimension"
              labelKey="fullLabel"
              datasets={datasets}
              height={420}
            />
          </ChartContainer>
        </>
      )}
    </div>
  );
}

/* ── Helper row component ─────────────────────────────────── */

function KpiRow({
  label,
  icon,
  values,
  textValues,
  decimal,
}: {
  label: string;
  icon: React.ReactNode;
  values?: number[];
  textValues?: string[];
  decimal?: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
      </td>
      {values
        ? values.map((v, i) => {
            const delta = i > 0 ? pctDelta(v, values[0]) : null;
            return (
              <td key={i} className="text-right py-2.5 px-3 tabular-nums font-medium">
                {decimal ? v.toFixed(1) : formatNumber(v)}
                {delta !== null && delta !== 0 && (
                  <span className={`text-xs ml-1 ${delta > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {delta > 0 ? "+" : ""}
                    {delta}%
                  </span>
                )}
              </td>
            );
          })
        : textValues?.map((v, i) => (
            <td key={i} className="text-right py-2.5 px-3 text-sm">
              {v}
            </td>
          ))}
    </tr>
  );
}

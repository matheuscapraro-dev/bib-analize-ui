"use client";

import { useMemo } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { ChartContainer } from "@/components/charts/chart-container";
import { useChartRef, ChartExportButton } from "@/components/chart-export-button";
import { coauthorshipNetwork, countryCollaborationNetwork, institutionCollaborationNetwork, keywordCooccurrenceNetwork } from "@/lib/data-processing";
import { NetworkGraph } from "@/components/charts/network-graph";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { Users, Building2, MapPin, Hash } from "lucide-react";

export default function ColaboracaoPage() {
  const { filtered } = useBib();
  const coauthRef = useChartRef();
  const instRef = useChartRef();
  const countryRef = useChartRef();
  const kwRef = useChartRef();

  const coauthNet = useMemo(() => coauthorshipNetwork(filtered, 50), [filtered]);
  const instNet = useMemo(() => institutionCollaborationNetwork(filtered, 40), [filtered]);
  const countryNet = useMemo(() => countryCollaborationNetwork(filtered, 30), [filtered]);
  const kwNet = useMemo(() => keywordCooccurrenceNetwork(filtered, "DE", 5, 40), [filtered]);

  const avgAuthorsPerDoc = useMemo(() => {
    const counts = filtered.map(w => (w.AU ?? "").split(";").filter(Boolean).length);
    return counts.length ? (counts.reduce((a, b) => a + b, 0) / counts.length) : 0;
  }, [filtered]);

  const intlCollab = useMemo(() => {
    let count = 0;
    for (const w of filtered) {
      const c1 = w.C1 ?? "";
      const countries = new Set<string>();
      for (const part of c1.split(";")) {
        const trimmed = part.trim();
        if (trimmed) {
          const last = trimmed.split(",").pop()?.trim();
          if (last) countries.add(last);
        }
      }
      if (countries.size > 1) count++;
    }
    return count;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader title="Colaboração" description="Redes de colaboração entre autores, instituições e países" />

      <KpiGrid>
        <KpiCard title="Média de Autores/Doc" value={avgAuthorsPerDoc.toFixed(1)} icon={<Users className="size-5" />} />
        <KpiCard title="Colab. Internacional" value={intlCollab} description={`${((intlCollab / filtered.length) * 100).toFixed(1)}% dos documentos`} icon={<MapPin className="size-5" />} />
      </KpiGrid>

      <Tabs defaultValue="coauthor">
        <TabsList>
          <TabsTrigger value="coauthor" className="gap-1"><Users className="size-3.5" />Coautoria</TabsTrigger>
          <TabsTrigger value="institution" className="gap-1"><Building2 className="size-3.5" />Instituições</TabsTrigger>
          <TabsTrigger value="country" className="gap-1"><MapPin className="size-3.5" />Países</TabsTrigger>
          <TabsTrigger value="keyword" className="gap-1"><Hash className="size-3.5" />Palavras-chave</TabsTrigger>
        </TabsList>
        <TabsContent value="coauthor">
          <ChartContainer ref={coauthRef} title="Rede de Coautoria" actions={<ChartExportButton chartRef={coauthRef} fileName="rede-coautoria" />}>
            {coauthNet.nodes.length > 0 ? <NetworkGraph data={coauthNet} height={550} /> : <EmptyState />}
          </ChartContainer>
        </TabsContent>
        <TabsContent value="institution">
          <ChartContainer ref={instRef} title="Rede de Colaboração Institucional" actions={<ChartExportButton chartRef={instRef} fileName="rede-instituicoes" />}>
            {instNet.nodes.length > 0 ? <NetworkGraph data={instNet} height={550} /> : <EmptyState />}
          </ChartContainer>
        </TabsContent>
        <TabsContent value="country">
          <ChartContainer ref={countryRef} title="Rede de Colaboração entre Países" actions={<ChartExportButton chartRef={countryRef} fileName="rede-paises" />}>
            {countryNet.nodes.length > 0 ? <NetworkGraph data={countryNet} height={550} /> : <EmptyState />}
          </ChartContainer>
        </TabsContent>
        <TabsContent value="keyword">
          <ChartContainer ref={kwRef} title="Rede de Coocorrência de Palavras-chave" actions={<ChartExportButton chartRef={kwRef} fileName="rede-keywords" />}>
            {kwNet.nodes.length > 0 ? <NetworkGraph data={kwNet} height={550} /> : <EmptyState />}
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}

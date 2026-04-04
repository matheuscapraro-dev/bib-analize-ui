"use client";

import { useCallback, useMemo, useState } from "react";
import { useBib } from "@/store/bibliometric-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid } from "@/components/kpi-cards";
import { Separator } from "@/components/ui/separator";
import { downloadCsv } from "@/lib/utils";
import { yearlyStats, authorMetrics, countValues, topN, lotkaLaw, bradfordLaw } from "@/lib/data-processing";
import {
  FileText, Users, BookOpen, TrendingUp, Calendar,
  Download, FileDown, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function ResumoPage() {
  const { filtered, kpis, source, fileName } = useBib();
  const [exporting, setExporting] = useState(false);

  const ys = useMemo(() => yearlyStats(filtered), [filtered]);
  const authors = useMemo(() => authorMetrics(filtered), [filtered]);
  const sources = useMemo(() => countValues(filtered, "SO"), [filtered]);
  const keywords = useMemo(() => countValues(filtered, "DE"), [filtered]);
  const countries = useMemo(() => countValues(filtered, "C1"), [filtered]);

  const exportCsv = useCallback(() => {
    const headers = ["UT", "TI", "AU", "SO", "PY", "DT", "TC", "DE", "ID", "AB", "C1", "C3", "DI", "OA", "LA", "WC", "SC"];
    const rows = filtered.map((w) => {
      const row: Record<string, unknown> = {};
      for (const h of headers) row[h] = (w as Record<string, unknown>)[h] ?? "";
      return row;
    });
    downloadCsv(rows, "bibliometric-data.csv");
    toast.success("CSV exportado.");
  }, [filtered]);

  const exportAuthors = useCallback(() => {
    const rows = authors.map((a) => ({
      Autor: a.name, Docs: a.count, Citações: a.citations,
      "h-Index": a.hIndex, "1ºPub": a.firstYear, "ÚltPub": a.lastYear,
    }));
    downloadCsv(rows, "authors.csv");
    toast.success("Autores exportados.");
  }, [authors]);

  const exportYearly = useCallback(() => {
    const rows = ys.map((y) => ({
      Ano: y.year, Docs: y.count, Citações: y.totalCitations,
      Média: y.avgCitations.toFixed(1), Acumulado: y.cumulativeCount,
    }));
    downloadCsv(rows, "yearly-stats.csv");
    toast.success("Dados anuais exportados.");
  }, [ys]);

  const exportAll = useCallback(async () => {
    setExporting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Main data
      const mainHeaders = ["UT", "TI", "AU", "SO", "PY", "DT", "TC", "DE", "ID", "AB", "C1", "C3", "DI", "OA", "LA"];
      const mainCsv = [mainHeaders.join(","), ...filtered.map(w =>
        mainHeaders.map(h => `"${String((w as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(",")
      )].join("\n");
      zip.file("data.csv", mainCsv);

      // Authors
      const authCsv = ["Autor,Docs,Citações,hIndex,1ºPub,ÚltPub", ...authors.map(a =>
        `"${a.name}",${a.count},${a.citations},${a.hIndex},${a.firstYear},${a.lastYear}`
      )].join("\n");
      zip.file("authors.csv", authCsv);

      // Yearly
      const yearlyCsv = ["Ano,Docs,Citações,Média,Acumulado", ...ys.map(y =>
        `${y.year},${y.count},${y.totalCitations},${y.avgCitations.toFixed(1)},${y.cumulativeCount}`
      )].join("\n");
      zip.file("yearly.csv", yearlyCsv);

      // Sources
      const srcCsv = ["Fonte,Docs", ...topN(sources, 200).map(([n, v]) => `"${n}",${v}`)].join("\n");
      zip.file("sources.csv", srcCsv);

      // Keywords
      const kwCsv = ["Keyword,Freq", ...topN(keywords, 500).map(([n, v]) => `"${n}",${v}`)].join("\n");
      zip.file("keywords.csv", kwCsv);

      // Summary
      const summary = [
        `BibAnalize - Resumo da Análise`,
        `Data: ${new Date().toLocaleDateString("pt-BR")}`,
        `Fonte: ${source === "openalex" ? "OpenAlex" : source === "wos" ? "Web of Science (API)" : "Web of Science"}`,
        fileName ? `Arquivo: ${fileName}` : "",
        ``,
        `Total de Documentos: ${kpis?.totalWorks}`,
        `Autores Únicos: ${kpis?.uniqueAuthors}`,
        `Fontes Únicas: ${kpis?.uniqueSources}`,
        `Total de Citações: ${kpis?.totalCitations}`,
        `Período: ${kpis?.yearRange[0]}-${kpis?.yearRange[1]}`,
        `Média Citações/Doc: ${kpis ? (kpis.totalCitations / kpis.totalWorks).toFixed(1) : ""}`,
      ].join("\n");
      zip.file("summary.txt", summary);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bibliometric-analysis.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP exportado com sucesso.");
    } catch {
      toast.error("Erro ao gerar ZIP.");
    } finally {
      setExporting(false);
    }
  }, [filtered, authors, ys, sources, keywords, kpis, source, fileName]);

  if (!kpis) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Resumo & Exportação" description="Visão geral e download dos resultados" />

      <KpiGrid>
        <KpiCard title="Documentos" value={kpis.totalWorks} icon={<FileText className="size-5" />} />
        <KpiCard title="Autores" value={kpis.uniqueAuthors} icon={<Users className="size-5" />} />
        <KpiCard title="Fontes" value={kpis.uniqueSources} icon={<BookOpen className="size-5" />} />
        <KpiCard title="Citações" value={kpis.totalCitations} icon={<TrendingUp className="size-5" />} />
        <KpiCard title="Período" value={`${kpis.yearRange[0]}–${kpis.yearRange[1]}`} icon={<Calendar className="size-5" />} />
      </KpiGrid>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="py-4"><CardContent className="px-4">
          <p className="text-xs text-muted-foreground uppercase">Média Citações/Doc</p>
          <p className="text-lg font-bold">{(kpis.totalCitations / kpis.totalWorks).toFixed(1)}</p>
        </CardContent></Card>
        <Card className="py-4"><CardContent className="px-4">
          <p className="text-xs text-muted-foreground uppercase">Palavras-chave Únicas</p>
          <p className="text-lg font-bold">{keywords.size}</p>
        </CardContent></Card>
        <Card className="py-4"><CardContent className="px-4">
          <p className="text-xs text-muted-foreground uppercase">Fonte dos Dados</p>
          <p className="text-lg font-bold">{source === "openalex" ? "OpenAlex" : source === "wos" ? "Web of Science (API)" : "Web of Science"}</p>
        </CardContent></Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Exportar Dados</CardTitle>
          <CardDescription>Baixe os dados da análise em diferentes formatos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <FileDown className="size-4" /> Dados (CSV)
            </Button>
            <Button variant="outline" onClick={exportAuthors} className="gap-2">
              <Users className="size-4" /> Autores (CSV)
            </Button>
            <Button variant="outline" onClick={exportYearly} className="gap-2">
              <Calendar className="size-4" /> Anual (CSV)
            </Button>
            <Button onClick={exportAll} disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exporting ? "Gerando..." : "Tudo (ZIP)"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

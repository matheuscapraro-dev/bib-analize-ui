/**
 * Comparison analysis compute functions.
 *
 * Each function takes ComparisonDataset[] and returns structured data
 * ready for visualization. All heavy computation is here so components
 * stay thin.
 */

import type { BibWork, KpiData, YearlyStats } from "@/types/bibliometric";
import type {
  ComparisonDataset,
  KpiComparison,
  RadarDimension,
  TemporalOverlayPoint,
  ButterflyItem,
  BoxPlotData,
  DistributionItem,
  OverlapResult,
} from "./types";
import {
  computeKpis,
  yearlyStats,
  extractAuthors,
  extractKeywords,
  extractCountries,
  extractInstitutions,
  authorMetrics,
  bradfordLaw,
} from "@/lib/data-processing";
import {
  computeOverlap,
  normalize,
  computeBoxPlot,
  countField,
  topNFromMap,
  uniqueFieldItems,
} from "./utils";

/* ================================================================
 *  GROUP 1 — Basic metrics & profile
 * ================================================================ */

export function computeKpiComparison(datasets: ComparisonDataset[]): KpiComparison[] {
  return datasets.map((ds) => ({
    datasetId: ds.id,
    datasetName: ds.name,
    color: ds.color,
    kpis: computeKpis(ds.works),
  }));
}

export function computeRadarProfile(datasets: ComparisonDataset[]): RadarDimension[] {
  const kpis = datasets.map((ds) => computeKpis(ds.works));

  const totalWorks = kpis.map((k) => k.totalWorks);
  const uniqueAuthors = kpis.map((k) => k.uniqueAuthors);
  const uniqueSources = kpis.map((k) => k.uniqueSources);
  const totalCitations = kpis.map((k) => k.totalCitations);
  const meanCitations = kpis.map((k) => k.meanCitations);

  // Collaboration: avg authors per document
  const avgAuthorsPerDoc = datasets.map((ds) => {
    const total = ds.works.reduce((s, w) => {
      const au = typeof w.AU === "string" ? w.AU.split("; ").length : 0;
      return s + au;
    }, 0);
    return ds.works.length > 0 ? total / ds.works.length : 0;
  });

  // Geographic reach: unique countries
  const geoReach = datasets.map((ds) => {
    const countries = new Set(extractCountries(ds.works).map((c) => c.país));
    return countries.size;
  });

  // OA percentage
  const oaPct = datasets.map((ds) => {
    const oaCount = ds.works.filter(
      (w) => w.OA && w.OA !== "closed" && w.OA !== "Fechado",
    ).length;
    return ds.works.length > 0 ? (oaCount / ds.works.length) * 100 : 0;
  });

  const dimensions: { key: string; label: string; values: number[] }[] = [
    { key: "production", label: "Produção", values: totalWorks },
    { key: "authors", label: "Autores", values: uniqueAuthors },
    { key: "sources", label: "Fontes", values: uniqueSources },
    { key: "citations", label: "Citações", values: totalCitations },
    { key: "impact", label: "Impacto Médio", values: meanCitations },
    { key: "collaboration", label: "Colaboração", values: avgAuthorsPerDoc },
    { key: "geoReach", label: "Alcance Geográfico", values: geoReach },
    { key: "openAccess", label: "Acesso Aberto %", values: oaPct },
  ];

  return dimensions.map(({ key, label, values }) => {
    const norm = normalize(values);
    const point: RadarDimension = { dimension: key, fullLabel: label };
    datasets.forEach((ds, i) => {
      point[ds.id] = Math.round(norm[i] * 100);
    });
    return point;
  });
}

/* ================================================================
 *  GROUP 2 — Temporal
 * ================================================================ */

export function computeProductionTimeline(
  datasets: ComparisonDataset[],
): TemporalOverlayPoint[] {
  const allStats = datasets.map((ds) => yearlyStats(ds.works));

  // Collect all years
  const yearSet = new Set<number>();
  for (const stats of allStats) {
    for (const s of stats) yearSet.add(s.year);
  }
  const years = [...yearSet].sort((a, b) => a - b);

  return years.map((year) => {
    const point: TemporalOverlayPoint = { year };
    datasets.forEach((ds, i) => {
      const stat = allStats[i].find((s) => s.year === year);
      point[ds.id] = stat?.count ?? 0;
    });
    return point;
  });
}

export function computeCitationTimeline(
  datasets: ComparisonDataset[],
): TemporalOverlayPoint[] {
  const allStats = datasets.map((ds) => yearlyStats(ds.works));

  const yearSet = new Set<number>();
  for (const stats of allStats) {
    for (const s of stats) yearSet.add(s.year);
  }
  const years = [...yearSet].sort((a, b) => a - b);

  return years.map((year) => {
    const point: TemporalOverlayPoint = { year };
    datasets.forEach((ds, i) => {
      const stat = allStats[i].find((s) => s.year === year);
      point[ds.id] = stat?.avgCitations ?? 0;
    });
    return point;
  });
}

export function computeCumulativeGrowth(
  datasets: ComparisonDataset[],
): TemporalOverlayPoint[] {
  const allStats = datasets.map((ds) => yearlyStats(ds.works));

  const yearSet = new Set<number>();
  for (const stats of allStats) {
    for (const s of stats) yearSet.add(s.year);
  }
  const years = [...yearSet].sort((a, b) => a - b);

  return years.map((year) => {
    const point: TemporalOverlayPoint = { year };
    datasets.forEach((ds, i) => {
      const stat = allStats[i].find((s) => s.year === year);
      point[ds.id] = stat?.cumulativeCount ?? 0;
    });
    return point;
  });
}

/* ================================================================
 *  GROUP 3 — Authors
 * ================================================================ */

export function computeAuthorOverlap(datasets: ComparisonDataset[]): OverlapResult {
  const sets = datasets.map((ds) => [...new Set(extractAuthors(ds.works))]);
  return computeOverlap(sets);
}

export function computeTopAuthorsComparison(
  datasets: ComparisonDataset[],
  topN = 20,
): ButterflyItem[] {
  // Gather the top N authors from each dataset, unify names
  const allAuthorCounts = datasets.map((ds) => {
    const metrics = authorMetrics(ds.works);
    return new Map(metrics.slice(0, topN).map((m) => [m.name, m.count]));
  });

  const allNames = new Set<string>();
  for (const m of allAuthorCounts) {
    for (const name of m.keys()) allNames.add(name);
  }

  return [...allNames]
    .map((name) => {
      const item: ButterflyItem = { name };
      datasets.forEach((ds, i) => {
        item[ds.id] = allAuthorCounts[i].get(name) ?? 0;
      });
      return item;
    })
    .sort((a, b) => {
      const sumA = datasets.reduce((s, ds) => s + ((a[ds.id] as number) ?? 0), 0);
      const sumB = datasets.reduce((s, ds) => s + ((b[ds.id] as number) ?? 0), 0);
      return sumB - sumA;
    })
    .slice(0, topN);
}

export function computeCollaborationIntensity(
  datasets: ComparisonDataset[],
): { metric: string; [datasetId: string]: number | string }[] {
  const metrics = datasets.map((ds) => {
    const works = ds.works;
    if (!works.length) return { avgAuthors: 0, intlPct: 0, multiInstPct: 0 };

    let totalAuthors = 0;
    let intlCount = 0;
    let multiInst = 0;

    for (const w of works) {
      const auCount = typeof w.AU === "string" ? w.AU.split("; ").filter(Boolean).length : 0;
      totalAuthors += auCount;
      if (w._N_COUNTRIES != null && w._N_COUNTRIES > 1) intlCount++;
      if (w._N_INSTITUTIONS != null && w._N_INSTITUTIONS > 1) multiInst++;
    }

    return {
      avgAuthors: Math.round((totalAuthors / works.length) * 100) / 100,
      intlPct: Math.round((intlCount / works.length) * 1000) / 10,
      multiInstPct: Math.round((multiInst / works.length) * 1000) / 10,
    };
  });

  const rows: { metric: string; [key: string]: number | string }[] = [
    { metric: "Autores/documento (média)" },
    { metric: "Colaboração internacional (%)" },
    { metric: "Multi-institucional (%)" },
  ];

  datasets.forEach((ds, i) => {
    rows[0][ds.id] = metrics[i].avgAuthors;
    rows[1][ds.id] = metrics[i].intlPct;
    rows[2][ds.id] = metrics[i].multiInstPct;
  });

  return rows;
}

/* ================================================================
 *  GROUP 4 — Sources / Journals
 * ================================================================ */

export function computeSourceOverlap(datasets: ComparisonDataset[]): OverlapResult {
  const sets = datasets.map((ds) => [...uniqueFieldItems(ds.works, "SO")]);
  return computeOverlap(sets);
}

export function computeTopSourcesComparison(
  datasets: ComparisonDataset[],
  topN = 20,
): ButterflyItem[] {
  const allCounts = datasets.map((ds) => countField(ds.works, "SO"));

  const allNames = new Set<string>();
  for (const m of allCounts) {
    for (const [name] of topNFromMap(m, topN)) allNames.add(name);
  }

  return [...allNames]
    .map((name) => {
      const item: ButterflyItem = { name };
      datasets.forEach((ds, i) => {
        item[ds.id] = allCounts[i].get(name) ?? 0;
      });
      return item;
    })
    .sort((a, b) => {
      const sumA = datasets.reduce((s, ds) => s + ((a[ds.id] as number) ?? 0), 0);
      const sumB = datasets.reduce((s, ds) => s + ((b[ds.id] as number) ?? 0), 0);
      return sumB - sumA;
    })
    .slice(0, topN);
}

export function computeBradfordComparison(datasets: ComparisonDataset[]) {
  return datasets.map((ds) => ({
    datasetId: ds.id,
    datasetName: ds.name,
    color: ds.color,
    bradford: bradfordLaw(ds.works),
  }));
}

/* ================================================================
 *  GROUP 5 — Thematic (Keywords & Areas)
 * ================================================================ */

export function computeKeywordOverlap(datasets: ComparisonDataset[]): OverlapResult {
  const sets = datasets.map((ds) => [...uniqueFieldItems(ds.works, "DE", true)]);
  return computeOverlap(sets);
}

export function computeTopKeywordsComparison(
  datasets: ComparisonDataset[],
  topN = 20,
): ButterflyItem[] {
  const allCounts = datasets.map((ds) => countField(ds.works, "DE", true));

  const allKeys = new Set<string>();
  for (const m of allCounts) {
    for (const [k] of topNFromMap(m, topN)) allKeys.add(k);
  }

  return [...allKeys]
    .map((name) => {
      const item: ButterflyItem = { name };
      datasets.forEach((ds, i) => {
        item[ds.id] = allCounts[i].get(name) ?? 0;
      });
      return item;
    })
    .sort((a, b) => {
      const sumA = datasets.reduce((s, ds) => s + ((a[ds.id] as number) ?? 0), 0);
      const sumB = datasets.reduce((s, ds) => s + ((b[ds.id] as number) ?? 0), 0);
      return sumB - sumA;
    })
    .slice(0, topN);
}

export function computeResearchAreasComparison(
  datasets: ComparisonDataset[],
  topN = 15,
): ButterflyItem[] {
  const allCounts = datasets.map((ds) => countField(ds.works, "WC"));

  const allAreas = new Set<string>();
  for (const m of allCounts) {
    for (const [a] of topNFromMap(m, topN)) allAreas.add(a);
  }

  return [...allAreas]
    .map((name) => {
      const item: ButterflyItem = { name };
      datasets.forEach((ds, i) => {
        item[ds.id] = allCounts[i].get(name) ?? 0;
      });
      return item;
    })
    .sort((a, b) => {
      const sumA = datasets.reduce((s, ds) => s + ((a[ds.id] as number) ?? 0), 0);
      const sumB = datasets.reduce((s, ds) => s + ((b[ds.id] as number) ?? 0), 0);
      return sumB - sumA;
    })
    .slice(0, topN);
}

/* ================================================================
 *  GROUP 6 — Geographic
 * ================================================================ */

export function computeCountryOverlap(datasets: ComparisonDataset[]): OverlapResult {
  const sets = datasets.map((ds) => {
    const countries = new Set(extractCountries(ds.works).map((c) => c.país));
    return [...countries];
  });
  return computeOverlap(sets);
}

export function computeTopCountriesComparison(
  datasets: ComparisonDataset[],
  topN = 20,
): ButterflyItem[] {
  const allCounts = datasets.map((ds) => {
    const map = new Map<string, number>();
    for (const c of extractCountries(ds.works)) {
      map.set(c.país, (map.get(c.país) ?? 0) + 1);
    }
    return map;
  });

  const allCountries = new Set<string>();
  for (const m of allCounts) {
    for (const [c] of topNFromMap(m, topN)) allCountries.add(c);
  }

  return [...allCountries]
    .map((name) => {
      const item: ButterflyItem = { name };
      datasets.forEach((ds, i) => {
        item[ds.id] = allCounts[i].get(name) ?? 0;
      });
      return item;
    })
    .sort((a, b) => {
      const sumA = datasets.reduce((s, ds) => s + ((a[ds.id] as number) ?? 0), 0);
      const sumB = datasets.reduce((s, ds) => s + ((b[ds.id] as number) ?? 0), 0);
      return sumB - sumA;
    })
    .slice(0, topN);
}

export function computeInstitutionOverlap(datasets: ComparisonDataset[]): OverlapResult {
  const sets = datasets.map((ds) => [...new Set(extractInstitutions(ds.works))]);
  return computeOverlap(sets);
}

export function computeGlobalSouthComparison(
  datasets: ComparisonDataset[],
): { datasetId: string; datasetName: string; color: string; pct: number; count: number; total: number }[] {
  return datasets.map((ds) => {
    const gsCount = ds.works.filter((w) => w._GLOBAL_SOUTH === true).length;
    return {
      datasetId: ds.id,
      datasetName: ds.name,
      color: ds.color,
      pct: ds.works.length > 0 ? Math.round((gsCount / ds.works.length) * 1000) / 10 : 0,
      count: gsCount,
      total: ds.works.length,
    };
  });
}

/* ================================================================
 *  GROUP 7 — Impact
 * ================================================================ */

export function computeCitationBoxPlots(datasets: ComparisonDataset[]): BoxPlotData[] {
  return datasets.map((ds) => {
    const citations = ds.works.map((w) => (typeof w.Z9 === "number" ? w.Z9 : typeof w.TC === "number" ? w.TC : 0));
    return computeBoxPlot(citations, ds);
  });
}

export function computeFwciBoxPlots(datasets: ComparisonDataset[]): BoxPlotData[] {
  return datasets.map((ds) => {
    const fwci = ds.works
      .map((w) => w._FWCI)
      .filter((v): v is number => v != null && v > 0);
    return computeBoxPlot(fwci, ds);
  });
}

export function computeTopCitedComparison(
  datasets: ComparisonDataset[],
  topN = 10,
): { datasetId: string; datasetName: string; color: string; articles: { title: string; citations: number; year: number; doi: string }[] }[] {
  return datasets.map((ds) => ({
    datasetId: ds.id,
    datasetName: ds.name,
    color: ds.color,
    articles: [...ds.works]
      .sort((a, b) => (b.Z9 ?? b.TC ?? 0) - (a.Z9 ?? a.TC ?? 0))
      .slice(0, topN)
      .map((w) => ({
        title: w.TI ?? "",
        citations: (w.Z9 ?? w.TC ?? 0) as number,
        year: w.PY ?? 0,
        doi: w.DI ?? "",
      })),
  }));
}

export function computePercentileComparison(
  datasets: ComparisonDataset[],
): { metric: string; [datasetId: string]: number | string }[] {
  const rows: { metric: string; [key: string]: number | string }[] = [
    { metric: "Top 1% citados (%)" },
    { metric: "Top 10% citados (%)" },
    { metric: "FWCI médio" },
    { metric: "Percentil médio" },
  ];

  datasets.forEach((ds) => {
    const n = ds.works.length || 1;
    const top1 = ds.works.filter((w) => w._TOP_1PCT === true).length;
    const top10 = ds.works.filter((w) => w._TOP_10PCT === true).length;
    const fwciVals = ds.works.map((w) => w._FWCI).filter((v): v is number => v != null);
    const percVals = ds.works.map((w) => w._CITE_PERCENTILE).filter((v): v is number => v != null);

    rows[0][ds.id] = Math.round((top1 / n) * 1000) / 10;
    rows[1][ds.id] = Math.round((top10 / n) * 1000) / 10;
    rows[2][ds.id] = fwciVals.length
      ? Math.round((fwciVals.reduce((s, v) => s + v, 0) / fwciVals.length) * 100) / 100
      : 0;
    rows[3][ds.id] = percVals.length
      ? Math.round((percVals.reduce((s, v) => s + v, 0) / percVals.length) * 10) / 10
      : 0;
  });

  return rows;
}

/* ================================================================
 *  GROUP 8 — Diversity (OA, doc types, languages, funding)
 * ================================================================ */

export function computeOaComparison(
  datasets: ComparisonDataset[],
): DistributionItem[] {
  const categories = ["gold", "green", "hybrid", "bronze", "diamond", "closed"];
  return categories.map((cat) => {
    const item: DistributionItem = { category: cat.charAt(0).toUpperCase() + cat.slice(1) };
    datasets.forEach((ds) => {
      item[ds.id] = ds.works.filter((w) => {
        const oa = (w.OA ?? "").toLowerCase();
        return oa === cat || (cat === "closed" && (!w.OA || oa === "fechado" || oa === "closed"));
      }).length;
    });
    return item;
  });
}

export function computeDocTypeComparison(
  datasets: ComparisonDataset[],
): DistributionItem[] {
  const allTypes = new Set<string>();
  for (const ds of datasets) {
    for (const w of ds.works) if (w.DT) allTypes.add(w.DT);
  }

  return [...allTypes]
    .map((cat) => {
      const item: DistributionItem = { category: cat };
      datasets.forEach((ds) => {
        item[ds.id] = ds.works.filter((w) => w.DT === cat).length;
      });
      return item;
    })
    .sort((a, b) => {
      const sumA = datasets.reduce((s, ds) => s + ((a[ds.id] as number) ?? 0), 0);
      const sumB = datasets.reduce((s, ds) => s + ((b[ds.id] as number) ?? 0), 0);
      return sumB - sumA;
    });
}

export function computeLanguageComparison(
  datasets: ComparisonDataset[],
  topN = 10,
): DistributionItem[] {
  const allLangs = new Set<string>();
  for (const ds of datasets) {
    for (const w of ds.works) if (w.LA) allLangs.add(w.LA);
  }

  return [...allLangs]
    .map((cat) => {
      const item: DistributionItem = { category: cat };
      datasets.forEach((ds) => {
        item[ds.id] = ds.works.filter((w) => w.LA === cat).length;
      });
      return item;
    })
    .sort((a, b) => {
      const sumA = datasets.reduce((s, ds) => s + ((a[ds.id] as number) ?? 0), 0);
      const sumB = datasets.reduce((s, ds) => s + ((b[ds.id] as number) ?? 0), 0);
      return sumB - sumA;
    })
    .slice(0, topN);
}

export function computeFundingComparison(
  datasets: ComparisonDataset[],
  topN = 15,
): ButterflyItem[] {
  const allCounts = datasets.map((ds) => countField(ds.works, "FU"));

  const allFunders = new Set<string>();
  for (const m of allCounts) {
    for (const [f] of topNFromMap(m, topN)) allFunders.add(f);
  }

  return [...allFunders]
    .map((name) => {
      const item: ButterflyItem = { name };
      datasets.forEach((ds, i) => {
        item[ds.id] = allCounts[i].get(name) ?? 0;
      });
      return item;
    })
    .sort((a, b) => {
      const sumA = datasets.reduce((s, ds) => s + ((a[ds.id] as number) ?? 0), 0);
      const sumB = datasets.reduce((s, ds) => s + ((b[ds.id] as number) ?? 0), 0);
      return sumB - sumA;
    })
    .slice(0, topN);
}

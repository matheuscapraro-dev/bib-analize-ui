import { useState, useCallback, useRef } from "react";
import type { BibWork } from "@/types/bibliometric";
import { filterWorksByField } from "@/lib/data-processing";
import type { ComparisonDataset } from "@/lib/comparison/types";

export type DrillDownFilter = (data: BibWork[], value: string) => BibWork[];

export function useArticleDrillDown(
  data: BibWork[],
  fieldOrFilter: string | DrillDownFilter,
) {
  const [drillLabel, setDrillLabel] = useState<string | null>(null);
  const [drillArticles, setDrillArticles] = useState<BibWork[]>([]);

  const filterRef = useRef(fieldOrFilter);
  const dataRef = useRef(data);
  filterRef.current = fieldOrFilter;
  dataRef.current = data;

  const handleDrill = useCallback((name: string) => {
    const f = filterRef.current;
    const d = dataRef.current;
    const articles =
      typeof f === "string" ? filterWorksByField(d, f, name) : f(d, name);
    setDrillLabel(name);
    setDrillArticles(articles);
  }, []);

  const closeDrill = useCallback(() => {
    setDrillLabel(null);
    setDrillArticles([]);
  }, []);

  const drillDownProps = {
    open: drillLabel !== null,
    onOpenChange: (open: boolean) => {
      if (!open) closeDrill();
    },
    title: `Artigos — ${drillLabel ?? ""}`,
    articles: drillArticles,
  };

  return { handleDrill, closeDrill, drillDownProps };
}

/**
 * Drill-down hook for program comparison pages.
 * Filters only the clicked program's works (not all programs merged).
 */
export function useProgramDrillDown(
  programs: ComparisonDataset[],
  fieldOrFilter?: string | DrillDownFilter,
) {
  const [drillLabel, setDrillLabel] = useState<string | null>(null);
  const [drillArticles, setDrillArticles] = useState<BibWork[]>([]);

  const programsRef = useRef(programs);
  const filterRef = useRef(fieldOrFilter);
  programsRef.current = programs;
  filterRef.current = fieldOrFilter;

  /** Drill into a specific value for a specific program. */
  const handleDrill = useCallback((name: string, datasetId: string) => {
    const p = programsRef.current.find((ds) => ds.id === datasetId);
    if (!p) return;
    const f = filterRef.current;
    const articles =
      f == null
        ? p.works
        : typeof f === "string"
          ? filterWorksByField(p.works, f, name)
          : f(p.works, name);
    setDrillLabel(`${name} — ${p.name}`);
    setDrillArticles(articles);
  }, []);

  /** Show all works for a specific program. */
  const handleDrillAll = useCallback((datasetId: string, label?: string) => {
    const p = programsRef.current.find((ds) => ds.id === datasetId);
    if (!p) return;
    setDrillLabel(label ? `${label} — ${p.name}` : p.name);
    setDrillArticles(p.works);
  }, []);

  /** Show an arbitrary pre-filtered set of articles. */
  const drillCustom = useCallback((articles: BibWork[], label: string) => {
    setDrillLabel(label);
    setDrillArticles(articles);
  }, []);

  const closeDrill = useCallback(() => {
    setDrillLabel(null);
    setDrillArticles([]);
  }, []);

  const drillDownProps = {
    open: drillLabel !== null,
    onOpenChange: (open: boolean) => {
      if (!open) closeDrill();
    },
    title: `Artigos — ${drillLabel ?? ""}`,
    articles: drillArticles,
  };

  return { handleDrill, handleDrillAll, drillCustom, closeDrill, drillDownProps };
}

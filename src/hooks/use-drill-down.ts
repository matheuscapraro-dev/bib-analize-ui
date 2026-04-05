import { useState, useCallback, useRef } from "react";
import type { BibWork } from "@/types/bibliometric";
import { filterWorksByField } from "@/lib/data-processing";

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

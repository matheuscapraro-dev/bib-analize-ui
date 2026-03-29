"use client";

import { useCallback, useEffect, useState } from "react";
import type { BibWork, DataSource, SavedAnalysis } from "@/types/bibliometric";
import {
  saveAnalysis as dbSave,
  loadAnalysis as dbLoad,
  listAnalyses as dbList,
  deleteAnalysis as dbDelete,
  renameAnalysis as dbRename,
} from "@/lib/saved-analyses-db";

export function useSavedAnalyses() {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await dbList();
      setAnalyses(list);
    } catch {
      // IndexedDB not available (SSR / private mode)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (
      meta: {
        id?: string;
        name: string;
        source: DataSource;
        fileName?: string;
        searchParams?: Record<string, unknown>;
      },
      works: BibWork[],
    ): Promise<SavedAnalysis> => {
      const saved = await dbSave(meta, works);
      await refresh();
      return saved;
    },
    [refresh],
  );

  const load = useCallback(async (id: string) => {
    const record = await dbLoad(id);
    return record;
  }, []);

  const remove = useCallback(
    async (id: string) => {
      await dbDelete(id);
      await refresh();
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await dbRename(id, name);
      await refresh();
    },
    [refresh],
  );

  return { analyses, loading, save, load, remove, rename, refresh };
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { BibWork, DataSource, FilterState, KpiData } from "@/types/bibliometric";
import { computeKpis } from "@/lib/data-processing";

/* ---------- State ---------- */
interface BibState {
  works: BibWork[];
  filtered: BibWork[];
  source: DataSource | null;
  fileName: string | null;
  loading: boolean;
  error: string | null;
  filters: FilterState;
  kpis: KpiData | null;
  searchParams: Record<string, unknown> | null;
  savedId: string | null;
}

const defaultFilters: FilterState = {
  yearRange: [1900, new Date().getFullYear()],
  docTypes: [],
  languages: [],
  oaStatuses: [],
  search: "",
};

const initialState: BibState = {
  works: [],
  filtered: [],
  source: null,
  fileName: null,
  loading: false,
  error: null,
  filters: defaultFilters,
  kpis: null,
  searchParams: null,
  savedId: null,
};

/* ---------- Actions ---------- */
type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_DATA"; payload: { works: BibWork[]; source: DataSource; fileName?: string; searchParams?: Record<string, unknown> } }
  | { type: "CLEAR_DATA" }
  | { type: "SET_FILTERS"; payload: Partial<FilterState> }
  | { type: "RESET_FILTERS" }
  | { type: "SET_SAVED_ID"; payload: string | null };

function applyFilters(works: BibWork[], f: FilterState): BibWork[] {
  let result = works;
  if (f.yearRange[0] > 1900 || f.yearRange[1] < new Date().getFullYear()) {
    result = result.filter((w) => {
      const y = w.PY;
      return y != null && y >= f.yearRange[0] && y <= f.yearRange[1];
    });
  }
  if (f.docTypes.length)
    result = result.filter((w) => f.docTypes.includes(w.DT ?? ""));
  if (f.languages.length)
    result = result.filter((w) => f.languages.includes(w.LA ?? ""));
  if (f.oaStatuses.length)
    result = result.filter((w) => f.oaStatuses.includes(w.OA ?? ""));
  if (f.search) {
    const q = f.search.toLowerCase();
    result = result.filter(
      (w) =>
        (w.TI ?? "").toLowerCase().includes(q) ||
        (w.AU ?? "").toLowerCase().includes(q) ||
        (w.SO ?? "").toLowerCase().includes(q) ||
        (w.DE ?? "").toLowerCase().includes(q) ||
        (w.AB ?? "").toLowerCase().includes(q),
    );
  }
  return result;
}

function reducer(state: BibState, action: Action): BibState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_DATA": {
      const works = action.payload.works;
      const filtered = applyFilters(works, state.filters);
      return {
        ...state,
        works,
        filtered,
        source: action.payload.source,
        fileName: action.payload.fileName ?? null,
        searchParams: action.payload.searchParams ?? null,
        savedId: null,
        loading: false,
        error: null,
        kpis: computeKpis(filtered),
      };
    }
    case "SET_SAVED_ID":
      return { ...state, savedId: action.payload };
    case "CLEAR_DATA":
      return { ...initialState };
    case "SET_FILTERS": {
      const newFilters = { ...state.filters, ...action.payload };
      const filtered = applyFilters(state.works, newFilters);
      return { ...state, filters: newFilters, filtered, kpis: computeKpis(filtered) };
    }
    case "RESET_FILTERS": {
      const filtered = applyFilters(state.works, defaultFilters);
      return { ...state, filters: defaultFilters, filtered, kpis: computeKpis(filtered) };
    }
    default:
      return state;
  }
}

/* ---------- Context ---------- */
interface BibContextValue extends BibState {
  setData: (works: BibWork[], source: DataSource, fileName?: string, searchParams?: Record<string, unknown>) => void;
  clearData: () => void;
  setFilters: (f: Partial<FilterState>) => void;
  resetFilters: () => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setSavedId: (id: string | null) => void;
  availableYears: number[];
  availableDocTypes: string[];
  availableLanguages: string[];
  availableOaStatuses: string[];
}

const BibContext = createContext<BibContextValue | null>(null);

export function BibProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setData = useCallback(
    (works: BibWork[], source: DataSource, fileName?: string, searchParams?: Record<string, unknown>) =>
      dispatch({ type: "SET_DATA", payload: { works, source, fileName, searchParams } }),
    [],
  );
  const setSavedId = useCallback(
    (id: string | null) => dispatch({ type: "SET_SAVED_ID", payload: id }),
    [],
  );
  const clearData = useCallback(() => dispatch({ type: "CLEAR_DATA" }), []);
  const setFilters = useCallback(
    (f: Partial<FilterState>) => dispatch({ type: "SET_FILTERS", payload: f }),
    [],
  );
  const resetFilters = useCallback(() => dispatch({ type: "RESET_FILTERS" }), []);
  const setLoading = useCallback(
    (v: boolean) => dispatch({ type: "SET_LOADING", payload: v }),
    [],
  );
  const setError = useCallback(
    (msg: string | null) => dispatch({ type: "SET_ERROR", payload: msg }),
    [],
  );

  const availableYears = useMemo(() => {
    const ySet = new Set<number>();
    for (const w of state.works) if (w.PY != null) ySet.add(w.PY);
    return [...ySet].sort((a, b) => a - b);
  }, [state.works]);

  const availableDocTypes = useMemo(() => {
    const s = new Set<string>();
    for (const w of state.works) if (w.DT) s.add(w.DT);
    return [...s].sort();
  }, [state.works]);

  const availableLanguages = useMemo(() => {
    const s = new Set<string>();
    for (const w of state.works) if (w.LA) s.add(w.LA);
    return [...s].sort();
  }, [state.works]);

  const availableOaStatuses = useMemo(() => {
    const s = new Set<string>();
    for (const w of state.works) if (w.OA) s.add(w.OA);
    return [...s].sort();
  }, [state.works]);

  const value = useMemo<BibContextValue>(
    () => ({
      ...state,
      setData,
      clearData,
      setFilters,
      resetFilters,
      setLoading,
      setError,
      setSavedId,
      availableYears,
      availableDocTypes,
      availableLanguages,
      availableOaStatuses,
    }),
    [state, setData, clearData, setFilters, resetFilters, setLoading, setError, setSavedId, availableYears, availableDocTypes, availableLanguages, availableOaStatuses],
  );

  return <BibContext value={value}>{children}</BibContext>;
}

export function useBib() {
  const ctx = useContext(BibContext);
  if (!ctx) throw new Error("useBib must be used within BibProvider");
  return ctx;
}

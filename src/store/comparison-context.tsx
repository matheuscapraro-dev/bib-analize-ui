"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { BibWork, DataSource } from "@/types/bibliometric";
import type { ComparisonDataset } from "@/lib/comparison/types";
import { DATASET_COLORS, MAX_DATASETS } from "@/lib/comparison/types";

/* ---------- State ---------- */
interface ComparisonState {
  datasets: ComparisonDataset[];
  loading: boolean;
  error: string | null;
}

const initialState: ComparisonState = {
  datasets: [],
  loading: false,
  error: null,
};

/* ---------- Actions ---------- */
type Action =
  | { type: "ADD_DATASET"; payload: { id: string; name: string; source: DataSource; works: BibWork[] } }
  | { type: "REMOVE_DATASET"; payload: string }
  | { type: "CLEAR_ALL" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_DATASETS"; payload: ComparisonDataset[] };

function reducer(state: ComparisonState, action: Action): ComparisonState {
  switch (action.type) {
    case "ADD_DATASET": {
      if (state.datasets.length >= MAX_DATASETS) return state;
      if (state.datasets.some((d) => d.id === action.payload.id)) return state;
      const colorIdx = state.datasets.length;
      const color = DATASET_COLORS[colorIdx];
      const ds: ComparisonDataset = {
        id: action.payload.id,
        name: action.payload.name,
        source: action.payload.source,
        works: action.payload.works,
        color: color.hsl,
        colorHex: color.hex,
        worksCount: action.payload.works.length,
      };
      return { ...state, datasets: [...state.datasets, ds], error: null };
    }
    case "REMOVE_DATASET": {
      const remaining = state.datasets.filter((d) => d.id !== action.payload);
      // Reassign colors to keep them sequential
      const recolored = remaining.map((d, i) => ({
        ...d,
        color: DATASET_COLORS[i].hsl,
        colorHex: DATASET_COLORS[i].hex,
      }));
      return { ...state, datasets: recolored };
    }
    case "CLEAR_ALL":
      return { ...initialState };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_DATASETS":
      return { ...state, datasets: action.payload, loading: false, error: null };
    default:
      return state;
  }
}

/* ---------- Context ---------- */
interface ComparisonContextValue extends ComparisonState {
  addDataset: (id: string, name: string, source: DataSource, works: BibWork[]) => void;
  removeDataset: (id: string) => void;
  clearAll: () => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  canAdd: boolean;
  isReady: boolean;
}

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addDataset = useCallback(
    (id: string, name: string, source: DataSource, works: BibWork[]) =>
      dispatch({ type: "ADD_DATASET", payload: { id, name, source, works } }),
    [],
  );

  const removeDataset = useCallback(
    (id: string) => dispatch({ type: "REMOVE_DATASET", payload: id }),
    [],
  );

  const clearAll = useCallback(() => dispatch({ type: "CLEAR_ALL" }), []);

  const setLoading = useCallback(
    (v: boolean) => dispatch({ type: "SET_LOADING", payload: v }),
    [],
  );

  const setError = useCallback(
    (msg: string | null) => dispatch({ type: "SET_ERROR", payload: msg }),
    [],
  );

  const value = useMemo<ComparisonContextValue>(
    () => ({
      ...state,
      addDataset,
      removeDataset,
      clearAll,
      setLoading,
      setError,
      canAdd: state.datasets.length < MAX_DATASETS,
      isReady: state.datasets.length >= 2,
    }),
    [state, addDataset, removeDataset, clearAll, setLoading, setError],
  );

  return <ComparisonContext value={value}>{children}</ComparisonContext>;
}

export function useComparison() {
  const ctx = useContext(ComparisonContext);
  if (!ctx) throw new Error("useComparison must be used within ComparisonProvider");
  return ctx;
}

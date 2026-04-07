"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { BibWork, DataSource, JournalMetrics } from "@/types/bibliometric";
import type { ProgramDataset } from "@/lib/comparison/types";
import { DATASET_COLORS, MAX_DATASETS } from "@/lib/comparison/types";

/* ---------- State ---------- */
interface ProgramState {
  programs: ProgramDataset[];
  journalMetrics: Map<string, JournalMetrics>;
  loading: boolean;
  error: string | null;
}

const initialState: ProgramState = {
  programs: [],
  journalMetrics: new Map(),
  loading: false,
  error: null,
};

/* ---------- Actions ---------- */
type Action =
  | {
      type: "ADD_PROGRAM";
      payload: {
        id: string;
        name: string;
        source: DataSource;
        works: BibWork[];
        programName: string;
        affiliationSearch: string;
        institutionId: string;
        institutionName: string;
      };
    }
  | { type: "REMOVE_PROGRAM"; payload: string }
  | { type: "CLEAR_ALL" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_JOURNAL_METRICS"; payload: Map<string, JournalMetrics> }
  | { type: "SET_PROGRAMS"; payload: ProgramDataset[] };

function reducer(state: ProgramState, action: Action): ProgramState {
  switch (action.type) {
    case "ADD_PROGRAM": {
      if (state.programs.length >= MAX_DATASETS) return state;
      if (state.programs.some((d) => d.id === action.payload.id)) return state;
      const colorIdx = state.programs.length;
      const color = DATASET_COLORS[colorIdx];
      const ds: ProgramDataset = {
        id: action.payload.id,
        name: action.payload.name,
        source: action.payload.source,
        works: action.payload.works,
        color: color.hsl,
        colorHex: color.hex,
        worksCount: action.payload.works.length,
        programName: action.payload.programName,
        affiliationSearch: action.payload.affiliationSearch,
        institutionId: action.payload.institutionId,
        institutionName: action.payload.institutionName,
      };
      return { ...state, programs: [...state.programs, ds], error: null };
    }
    case "REMOVE_PROGRAM": {
      const remaining = state.programs.filter((d) => d.id !== action.payload);
      const recolored = remaining.map((d, i) => ({
        ...d,
        color: DATASET_COLORS[i].hsl,
        colorHex: DATASET_COLORS[i].hex,
      }));
      return { ...state, programs: recolored };
    }
    case "CLEAR_ALL":
      return { ...initialState, journalMetrics: new Map() };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_JOURNAL_METRICS":
      return { ...state, journalMetrics: action.payload };
    case "SET_PROGRAMS":
      return { ...state, programs: action.payload, loading: false, error: null };
    default:
      return state;
  }
}

/* ---------- Context ---------- */
interface ProgramContextValue extends ProgramState {
  addProgram: (p: {
    id: string;
    name: string;
    source: DataSource;
    works: BibWork[];
    programName: string;
    affiliationSearch: string;
    institutionId: string;
    institutionName: string;
  }) => void;
  removeProgram: (id: string) => void;
  clearAll: () => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setJournalMetrics: (m: Map<string, JournalMetrics>) => void;
  canAdd: boolean;
  isReady: boolean;
}

const ProgramContext = createContext<ProgramContextValue | null>(null);

export function ProgramProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addProgram = useCallback(
    (p: {
      id: string;
      name: string;
      source: DataSource;
      works: BibWork[];
      programName: string;
      affiliationSearch: string;
      institutionId: string;
      institutionName: string;
    }) => dispatch({ type: "ADD_PROGRAM", payload: p }),
    [],
  );

  const removeProgram = useCallback(
    (id: string) => dispatch({ type: "REMOVE_PROGRAM", payload: id }),
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

  const setJournalMetrics = useCallback(
    (m: Map<string, JournalMetrics>) => dispatch({ type: "SET_JOURNAL_METRICS", payload: m }),
    [],
  );

  const value = useMemo<ProgramContextValue>(
    () => ({
      ...state,
      addProgram,
      removeProgram,
      clearAll,
      setLoading,
      setError,
      setJournalMetrics,
      canAdd: state.programs.length < MAX_DATASETS,
      isReady: state.programs.length >= 2,
    }),
    [state, addProgram, removeProgram, clearAll, setLoading, setError, setJournalMetrics],
  );

  return <ProgramContext value={value}>{children}</ProgramContext>;
}

export function usePrograms() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error("usePrograms must be used within ProgramProvider");
  return ctx;
}

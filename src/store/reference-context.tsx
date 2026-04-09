"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import type { BibWork } from "@/types/bibliometric";
import {
  searchSeedWorks,
  expandReferences,
} from "@/lib/reference-explorer";

/* ── Types ────────────────────────────────────────────────── */

export interface RefNode {
  id: string;                   // OpenAlex ID (e.g. "W123456")
  work: Partial<BibWork>;
  level: number;                // 0 = seed, 1, 2
  expanded: boolean;
  loading: boolean;
}

export interface RefEdge {
  source: string;               // parent id
  target: string;               // referenced work id
}

interface RefState {
  nodes: Map<string, RefNode>;
  edges: RefEdge[];
  seeds: string[];              // node ids that are seeds
  searchQuery: string;
  searchResults: Partial<BibWork>[];
  searchLoading: boolean;
  maxRefsPerNode: number;
  selectedNodeId: string | null;
  exploring: boolean;           // initial expansion in progress
}

/* ── Actions ──────────────────────────────────────────────── */

type Action =
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SET_SEARCH_RESULTS"; results: Partial<BibWork>[]; loading: boolean }
  | { type: "ADD_SEED"; work: Partial<BibWork> }
  | { type: "REMOVE_SEED"; id: string }
  | { type: "SET_MAX_REFS"; value: number }
  | { type: "SET_SELECTED_NODE"; id: string | null }
  | { type: "SET_EXPLORING"; value: boolean }
  | { type: "SET_NODE_LOADING"; id: string; loading: boolean }
  | { type: "ADD_REFS"; parentId: string; works: Partial<BibWork>[]; level: number }
  | { type: "MARK_EXPANDED"; id: string }
  | { type: "RESET" };

const initialState: RefState = {
  nodes: new Map(),
  edges: [],
  seeds: [],
  searchQuery: "",
  searchResults: [],
  searchLoading: false,
  maxRefsPerNode: 15,
  selectedNodeId: null,
  exploring: false,
};

function reducer(state: RefState, action: Action): RefState {
  switch (action.type) {
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.query };

    case "SET_SEARCH_RESULTS":
      return { ...state, searchResults: action.results, searchLoading: action.loading };

    case "ADD_SEED": {
      const id = String(action.work.UT ?? "");
      if (!id || state.nodes.has(id)) return state;
      const nodes = new Map(state.nodes);
      nodes.set(id, { id, work: action.work, level: 0, expanded: false, loading: false });
      return { ...state, nodes, seeds: [...state.seeds, id] };
    }

    case "REMOVE_SEED": {
      // Remove seed and all downstream nodes/edges only reachable from it
      const nodes = new Map(state.nodes);
      const edges = [...state.edges];

      // Collect nodes to remove via BFS from this seed
      const toRemove = new Set<string>();
      const queue = [action.id];
      while (queue.length) {
        const cur = queue.shift()!;
        if (toRemove.has(cur)) continue;
        // Don't remove if it's another seed or reachable from another seed
        if (cur !== action.id && state.seeds.includes(cur)) continue;
        toRemove.add(cur);
        for (const e of edges) {
          if (e.source === cur && !toRemove.has(e.target)) {
            // Only queue if no other parent outside toRemove
            const otherParents = edges.filter(
              (ed) => ed.target === e.target && ed.source !== cur && !toRemove.has(ed.source),
            );
            if (otherParents.length === 0) queue.push(e.target);
          }
        }
      }

      for (const id of toRemove) nodes.delete(id);
      const newEdges = edges.filter((e) => !toRemove.has(e.source) && !toRemove.has(e.target));
      const newSeeds = state.seeds.filter((s) => s !== action.id);
      return { ...state, nodes, edges: newEdges, seeds: newSeeds, selectedNodeId: state.selectedNodeId === action.id ? null : state.selectedNodeId };
    }

    case "SET_MAX_REFS":
      return { ...state, maxRefsPerNode: action.value };

    case "SET_SELECTED_NODE":
      return { ...state, selectedNodeId: action.id };

    case "SET_EXPLORING":
      return { ...state, exploring: action.value };

    case "SET_NODE_LOADING": {
      const node = state.nodes.get(action.id);
      if (!node) return state;
      const nodes = new Map(state.nodes);
      nodes.set(action.id, { ...node, loading: action.loading });
      return { ...state, nodes };
    }

    case "ADD_REFS": {
      const nodes = new Map(state.nodes);
      const newEdges = [...state.edges];

      for (const w of action.works) {
        const id = String(w.UT ?? "");
        if (!id) continue;
        if (!nodes.has(id)) {
          nodes.set(id, { id, work: w, level: action.level, expanded: false, loading: false });
        }
        const edgeExists = newEdges.some((e) => e.source === action.parentId && e.target === id);
        if (!edgeExists) {
          newEdges.push({ source: action.parentId, target: id });
        }
      }

      return { ...state, nodes, edges: newEdges };
    }

    case "MARK_EXPANDED": {
      const node = state.nodes.get(action.id);
      if (!node) return state;
      const nodes = new Map(state.nodes);
      nodes.set(action.id, { ...node, expanded: true, loading: false });
      return { ...state, nodes };
    }

    case "RESET":
      return { ...initialState, maxRefsPerNode: state.maxRefsPerNode };

    default:
      return state;
  }
}

/* ── Context ──────────────────────────────────────────────── */

interface RefContextValue extends RefState {
  dispatch: Dispatch<Action>;
  search: (query: string) => Promise<void>;
  addSeed: (work: Partial<BibWork>) => void;
  removeSeed: (id: string) => void;
  explore: () => Promise<void>;
  expandNode: (id: string) => Promise<void>;
  setMaxRefs: (n: number) => void;
  selectNode: (id: string | null) => void;
  reset: () => void;
}

const RefContext = createContext<RefContextValue | null>(null);

export function RefProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const search = useCallback(async (query: string) => {
    dispatch({ type: "SET_SEARCH_QUERY", query });
    if (!query.trim()) {
      dispatch({ type: "SET_SEARCH_RESULTS", results: [], loading: false });
      return;
    }
    dispatch({ type: "SET_SEARCH_RESULTS", results: state.searchResults, loading: true });
    try {
      const results = await searchSeedWorks(query);
      dispatch({ type: "SET_SEARCH_RESULTS", results, loading: false });
    } catch {
      dispatch({ type: "SET_SEARCH_RESULTS", results: [], loading: false });
    }
  }, [state.searchResults]);

  const addSeed = useCallback((work: Partial<BibWork>) => {
    dispatch({ type: "ADD_SEED", work });
  }, []);

  const removeSeed = useCallback((id: string) => {
    dispatch({ type: "REMOVE_SEED", id });
  }, []);

  const expandNode = useCallback(async (id: string) => {
    const node = state.nodes.get(id);
    if (!node || node.expanded || node.level >= 2) return;

    const refIds = (node.work._REF_IDS as string[] | undefined) ?? [];
    if (!refIds.length) {
      dispatch({ type: "MARK_EXPANDED", id });
      return;
    }

    dispatch({ type: "SET_NODE_LOADING", id, loading: true });
    try {
      const refs = await expandReferences(refIds, state.maxRefsPerNode);
      dispatch({ type: "ADD_REFS", parentId: id, works: refs, level: node.level + 1 });
      dispatch({ type: "MARK_EXPANDED", id });
    } catch {
      dispatch({ type: "SET_NODE_LOADING", id, loading: false });
    }
  }, [state.nodes, state.maxRefsPerNode]);

  const explore = useCallback(async () => {
    dispatch({ type: "SET_EXPLORING", value: true });
    // Expand all seeds in parallel
    const seedNodes = state.seeds
      .map((id) => state.nodes.get(id))
      .filter((n): n is RefNode => !!n && !n.expanded);

    await Promise.all(seedNodes.map((n) => expandNode(n.id)));
    dispatch({ type: "SET_EXPLORING", value: false });
  }, [state.seeds, state.nodes, expandNode]);

  const setMaxRefs = useCallback((n: number) => {
    dispatch({ type: "SET_MAX_REFS", value: n });
  }, []);

  const selectNode = useCallback((id: string | null) => {
    dispatch({ type: "SET_SELECTED_NODE", id });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return (
    <RefContext.Provider
      value={{
        ...state,
        dispatch,
        search,
        addSeed,
        removeSeed,
        explore,
        expandNode,
        setMaxRefs,
        selectNode,
        reset,
      }}
    >
      {children}
    </RefContext.Provider>
  );
}

export function useRef_() {
  const ctx = useContext(RefContext);
  if (!ctx) throw new Error("useRef_ must be used within RefProvider");
  return ctx;
}

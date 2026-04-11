"use client";

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/charts/bar-chart";
import { Treemap } from "@/components/charts/treemap";
import { DataTable } from "@/components/data-table";
import type { RefNode, RefEdge } from "@/store/reference-context";

/* ── Types ────────────────────────────────────────────────── */

export interface ImportanceEntry {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  citations: number;
  inDegree: number;
  score: number;
  level: number;
}

interface ReferenceImportanceProps {
  nodes: Map<string, RefNode>;
  edges: RefEdge[];
  onNodeClick?: (id: string) => void;
}

/* ── Score computation ─────────────────────────────────────── */

function computeImportance(
  nodes: Map<string, RefNode>,
  edges: RefEdge[],
): ImportanceEntry[] {
  // Count in-degree per node
  const inDegreeMap = new Map<string, number>();
  for (const e of edges) {
    inDegreeMap.set(e.target, (inDegreeMap.get(e.target) ?? 0) + 1);
  }

  const entries: ImportanceEntry[] = [];

  for (const [id, node] of nodes) {
    // Exclude seeds (level 0) from ranking
    if (node.level === 0) continue;

    const tc = Number(node.work.TC ?? 0);
    const inDeg = inDegreeMap.get(id) ?? 0;
    const score = inDeg * Math.log2(tc + 1);

    entries.push({
      id,
      title: String(node.work.TI ?? "Sem título"),
      authors: String(node.work.AU ?? ""),
      year: Number(node.work.PY ?? 0),
      journal: String(node.work.SO ?? ""),
      citations: tc,
      inDegree: inDeg,
      score: Math.round(score * 100) / 100,
      level: node.level,
    });
  }

  entries.sort((a, b) => b.score - a.score);
  return entries;
}

/* ── Table columns ────────────────────────────────────────── */

const columns: ColumnDef<ImportanceEntry, unknown>[] = [
  {
    accessorKey: "rank",
    header: "#",
    cell: ({ row }) => row.index + 1,
    size: 40,
    enableSorting: false,
  },
  {
    accessorKey: "title",
    header: "Título",
    cell: ({ row }) => (
      <span className="line-clamp-2 text-xs" title={row.original.title}>
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "authors",
    header: "Autores",
    cell: ({ row }) => (
      <span className="line-clamp-1 text-xs text-muted-foreground" title={row.original.authors}>
        {row.original.authors || "—"}
      </span>
    ),
  },
  {
    accessorKey: "year",
    header: "Ano",
    cell: ({ row }) => row.original.year || "—",
    size: 60,
  },
  {
    accessorKey: "journal",
    header: "Periódico",
    cell: ({ row }) => (
      <span className="line-clamp-1 text-xs" title={row.original.journal}>
        {row.original.journal || "—"}
      </span>
    ),
  },
  {
    accessorKey: "citations",
    header: "Citações",
    cell: ({ row }) => row.original.citations.toLocaleString(),
    size: 80,
  },
  {
    accessorKey: "inDegree",
    header: "In-Degree",
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        ×{row.original.inDegree}
      </Badge>
    ),
    size: 80,
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">{row.original.score.toFixed(2)}</span>
    ),
    size: 80,
  },
];

/* ── Component ────────────────────────────────────────────── */

export function ReferenceImportance({ nodes, edges, onNodeClick }: ReferenceImportanceProps) {
  const entries = useMemo(() => computeImportance(nodes, edges), [nodes, edges]);
  const top20 = useMemo(() => entries.slice(0, 20), [entries]);

  /* Bar chart data */
  const barData = useMemo(
    () =>
      top20.map((e) => ({
        name: e.title.length > 40 ? e.title.slice(0, 37) + "…" : e.title,
        score: e.score,
        _id: e.id,
        _level: e.level,
      })).reverse(), // reverse so highest is on top in horizontal bars
    [top20],
  );

  /* Treemap data */
  const treemapData = useMemo(
    () =>
      entries
        .filter((e) => e.score > 0)
        .slice(0, 50)
        .map((e) => ({
          name: `${e.title.length > 30 ? e.title.slice(0, 27) + "…" : e.title} (${e.year || "?"})`,
          value: Math.max(Math.round(e.score * 100), 1),
          _id: e.id,
        })),
    [entries],
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">Nenhuma referência encontrada para classificar.</p>
        <p className="text-xs mt-1">Expanda mais nós no grafo para gerar o ranking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* A) Ranking horizontal bars (Top 20) */}
      <section>
        <h3 className="text-sm font-semibold mb-1">
          Top {Math.min(20, entries.length)} Referências por Importância
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Score = In-Degree × log₂(Citações + 1). Referências citadas por múltiplas fontes e com mais citações globais aparecem no topo.
        </p>
        <BarChart
          data={barData}
          xKey="name"
          bars={[{ key: "score", label: "Score", color: "hsl(221 83% 53%)" }]}
          layout="vertical"
          height={Math.max(350, top20.length * 28)}
          labelMaxLen={40}
          onBarClick={(entry) => {
            const id = entry._id as string;
            if (id && onNodeClick) onNodeClick(id);
          }}
        />
      </section>

      {/* B) Treemap */}
      {treemapData.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-1">Mapa de Importância</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Tamanho proporcional ao score de importância. Clique para ver detalhes.
          </p>
          <Treemap
            data={treemapData}
            height={400}
            onCellClick={(cell) => {
              const match = treemapData.find((d) => d.name === cell.name);
              if (match && onNodeClick) onNodeClick((match as { _id: string })._id);
            }}
          />
        </section>
      )}

      {/* C) Full table */}
      <section>
        <h3 className="text-sm font-semibold mb-1">Tabela Completa</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Todas as referências encontradas (excluindo sementes), ordenáveis por qualquer coluna.
        </p>
        <DataTable
          columns={columns}
          data={entries}
          searchColumn="title"
          searchPlaceholder="Buscar por título ou autor..."
          pageSize={15}
          onRowClick={(row) => onNodeClick?.(row.id)}
        />
      </section>
    </div>
  );
}

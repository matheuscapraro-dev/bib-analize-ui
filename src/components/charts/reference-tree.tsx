"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RefNode, RefEdge } from "@/store/reference-context";

interface ReferenceTreeProps {
  nodes: Map<string, RefNode>;
  edges: RefEdge[];
  seeds: string[];
  height?: number;
  onNodeClick?: (id: string) => void;
  onExpand?: (id: string) => void;
  selectedNodeId?: string | null;
}

interface TreeItem {
  node: RefNode;
  children: TreeItem[];
  depth: number;
}

const LEVEL_DOT = ["bg-emerald-500", "bg-blue-500", "bg-zinc-400"];

function buildTree(
  seeds: string[],
  nodes: Map<string, RefNode>,
  edges: RefEdge[],
): TreeItem[] {
  // Build adjacency: parent → children
  const childMap = new Map<string, string[]>();
  for (const e of edges) {
    if (!childMap.has(e.source)) childMap.set(e.source, []);
    childMap.get(e.source)!.push(e.target);
  }

  const visited = new Set<string>();

  function buildSubtree(id: string, depth: number): TreeItem | null {
    const node = nodes.get(id);
    if (!node) return null;
    if (visited.has(id)) {
      // Show node but don't recurse (break cycles / shared refs)
      return { node, children: [], depth };
    }
    visited.add(id);

    const childIds = childMap.get(id) ?? [];
    const children: TreeItem[] = [];
    for (const cid of childIds) {
      const sub = buildSubtree(cid, depth + 1);
      if (sub) children.push(sub);
    }

    // Sort children by citations desc
    children.sort((a, b) => (b.node.work.TC ?? 0) - (a.node.work.TC ?? 0));

    return { node, children, depth };
  }

  const roots: TreeItem[] = [];
  for (const sid of seeds) {
    const tree = buildSubtree(sid, 0);
    if (tree) roots.push(tree);
  }
  return roots;
}

export function ReferenceTree({
  nodes,
  edges,
  seeds,
  height = 600,
  onNodeClick,
  onExpand,
  selectedNodeId,
}: ReferenceTreeProps) {
  const tree = useMemo(() => buildTree(seeds, nodes, edges), [seeds, nodes, edges]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!tree.length) return null;

  return (
    <ScrollArea style={{ height }} className="w-full">
      <div className="p-4 space-y-1">
        {tree.map((item) => (
          <TreeNode
            key={item.node.id}
            item={item}
            collapsed={collapsed}
            toggleCollapse={toggleCollapse}
            onNodeClick={onNodeClick}
            onExpand={onExpand}
            selectedNodeId={selectedNodeId}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function TreeNode({
  item,
  collapsed,
  toggleCollapse,
  onNodeClick,
  onExpand,
  selectedNodeId,
}: {
  item: TreeItem;
  collapsed: Set<string>;
  toggleCollapse: (id: string) => void;
  onNodeClick?: (id: string) => void;
  onExpand?: (id: string) => void;
  selectedNodeId?: string | null;
}) {
  const { node, children, depth } = item;
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = children.length > 0;
  const canExpand = node.level < 2 && !node.expanded && ((node.work._REF_IDS as string[] | undefined) ?? []).length > 0;
  const isSelected = selectedNodeId === node.id;

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors
          ${isSelected ? "bg-accent" : "hover:bg-muted/50"}`}
        onClick={() => onNodeClick?.(node.id)}
      >
        {/* Collapse toggle */}
        <button
          className="shrink-0 size-5 flex items-center justify-center rounded hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleCollapse(node.id);
            else if (canExpand) onExpand?.(node.id);
          }}
        >
          {node.loading ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : hasChildren ? (
            isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />
          ) : canExpand ? (
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
          ) : (
            <span className="size-3.5" />
          )}
        </button>

        {/* Level dot */}
        <span className={`shrink-0 size-2 rounded-full ${LEVEL_DOT[Math.min(node.level, 2)]}`} />

        {/* Title */}
        <span className="truncate flex-1 font-medium" title={String(node.work.TI ?? "")}>
          {String(node.work.TI ?? "Sem título").slice(0, 80)}
          {String(node.work.TI ?? "").length > 80 ? "..." : ""}
        </span>

        {/* Year */}
        {node.work.PY ? (
          <span className="shrink-0 text-xs text-muted-foreground">{node.work.PY}</span>
        ) : null}

        {/* Citations */}
        {node.work.TC != null && (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {node.work.TC} cit.
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="border-l border-border/50 ml-4">
          {children.map((child) => (
            <TreeNode
              key={child.node.id}
              item={child}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              onNodeClick={onNodeClick}
              onExpand={onExpand}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

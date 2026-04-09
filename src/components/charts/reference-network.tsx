"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { RefNode, RefEdge } from "@/store/reference-context";

interface ReferenceNetworkProps {
  nodes: Map<string, RefNode>;
  edges: RefEdge[];
  height?: number;
  onNodeClick?: (id: string) => void;
  selectedNodeId?: string | null;
}

interface SimNode {
  id: string;
  label: string;
  size: number;
  level: number;
  expanded: boolean;
  loading: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const LEVEL_COLORS_LIGHT = ["#10b981", "#3b82f6", "#a1a1aa"];
const LEVEL_COLORS_DARK = ["#34d399", "#60a5fa", "#a1a1aa"];
const SELECTED_RING = "#f59e0b";

export function ReferenceNetwork({
  nodes,
  edges,
  height = 600,
  onNodeClick,
  selectedNodeId,
}: ReferenceNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [layoutDone, setLayoutDone] = useState(false);

  const edgeList = useMemo(() => edges, [edges]);

  // Build sim nodes from RefNode map
  useMemo(() => {
    const arr = Array.from(nodes.values());
    if (!arr.length) { simNodesRef.current = []; return; }

    const maxCit = Math.max(...arr.map((n) => n.work.TC ?? 0), 1);
    const existing = new Map(simNodesRef.current.map((n) => [n.id, n]));

    simNodesRef.current = arr.map((n) => {
      const prev = existing.get(n.id);
      const cit = n.work.TC ?? 0;
      return {
        id: n.id,
        label: String(n.work.TI ?? "").slice(0, 50) || n.id,
        size: 5 + (cit / maxCit) * 22,
        level: n.level,
        expanded: n.expanded,
        loading: n.loading,
        x: prev?.x ?? Math.random() * 600 - 300,
        y: prev?.y ?? Math.random() * 400 - 200,
        vx: 0,
        vy: 0,
      };
    });
    setLayoutDone(false);
  }, [nodes]);

  // Force layout
  useEffect(() => {
    const simNodes = simNodesRef.current;
    if (!simNodes.length) return;
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    let iter = 0;
    const totalIters = 150;
    const batchSize = 10;
    let rafId: number;

    function step() {
      const end = Math.min(iter + batchSize, totalIters);
      for (; iter < end; iter++) {
        const temp = 1 - iter / totalIters;
        // Repulsion
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const a = simNodes[i], b = simNodes[j];
            let dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (200 * temp) / dist;
            dx = (dx / dist) * force;
            dy = (dy / dist) * force;
            a.vx += dx; a.vy += dy;
            b.vx -= dx; b.vy -= dy;
          }
        }
        // Attraction along edges
        for (const e of edgeList) {
          const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
          if (!a || !b) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = dist * 0.004 * temp;
          a.vx += (dx / dist) * force;
          a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force;
          b.vy -= (dy / dist) * force;
        }
        // Gravity toward center + damping
        for (const n of simNodes) {
          n.vx -= n.x * 0.008 * temp;
          n.vy -= n.y * 0.008 * temp;
          n.x += n.vx * 0.7;
          n.y += n.vy * 0.7;
          n.vx *= 0.5;
          n.vy *= 0.5;
        }
      }
      if (iter < totalIters) {
        rafId = requestAnimationFrame(step);
      } else {
        setLayoutDone(true);
      }
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [nodes, edgeList]);

  // Draw
  useEffect(() => {
    if (!layoutDone) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const simNodes = simNodesRef.current;
    const w = containerRef.current?.clientWidth ?? 800;
    const h = height;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(2, 2);

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
    const isDark = document.documentElement.classList.contains("dark");
    const levelColors = isDark ? LEVEL_COLORS_DARK : LEVEL_COLORS_LIGHT;

    // Scale to fit
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of simNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const pad = 50;
    for (const n of simNodes) {
      n.x = pad + ((n.x - minX) / rangeX) * (w - 2 * pad);
      n.y = pad + ((n.y - minY) / rangeY) * (h - 2 * pad);
    }

    ctx.clearRect(0, 0, w, h);

    // Edges with arrows
    for (const e of edgeList) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) continue;

      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist, ny = dy / dist;

      // Line ends at node edge
      const startX = a.x + nx * a.size;
      const startY = a.y + ny * a.size;
      const endX = b.x - nx * (b.size + 4);
      const endY = b.y - ny * (b.size + 4);

      ctx.strokeStyle = isDark ? "rgba(200,200,220,0.15)" : "rgba(100,100,120,0.2)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrowhead
      const arrowLen = 6;
      const arrowAngle = Math.PI / 7;
      const angle = Math.atan2(endY - startY, endX - startX);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - arrowLen * Math.cos(angle - arrowAngle), endY - arrowLen * Math.sin(angle - arrowAngle));
      ctx.lineTo(endX - arrowLen * Math.cos(angle + arrowAngle), endY - arrowLen * Math.sin(angle + arrowAngle));
      ctx.closePath();
      ctx.fill();
    }

    // Nodes
    for (const n of simNodes) {
      // Glow for shared nodes (multiple incoming edges)
      const incoming = edgeList.filter((e) => e.target === n.id);
      if (incoming.length > 1) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size + 4, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fillStyle = levelColors[Math.min(n.level, 2)] ?? levelColors[2];
      ctx.fill();
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Selected ring
      if (selectedNodeId === n.id) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size + 3, 0, Math.PI * 2);
        ctx.strokeStyle = SELECTED_RING;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Loading indicator
      if (n.loading) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size + 3, 0, Math.PI * 0.8);
        ctx.strokeStyle = SELECTED_RING;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Labels for top nodes by size
    const labelColor = isDark ? "#e2e8f0" : "#1e293b";
    ctx.font = "10px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    const topLabeled = simNodes.slice().sort((a, b) => b.size - a.size).slice(0, 30);
    for (const n of topLabeled) {
      const text = n.label.length > 35 ? n.label.slice(0, 32) + "..." : n.label;
      const metrics = ctx.measureText(text);
      const tx = n.x;
      const ty = n.y - n.size - 5;
      ctx.fillStyle = isDark ? "rgba(15,23,42,0.75)" : "rgba(255,255,255,0.85)";
      ctx.fillRect(tx - metrics.width / 2 - 2, ty - 7, metrics.width + 4, 13);
      ctx.fillStyle = labelColor;
      ctx.fillText(text, tx, ty);
    }

    // Legend
    const legendY = h - 20;
    const legendX = 16;
    const labels = ["Semente", "Nível 1", "Nível 2"];
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(legendX + i * 80, legendY, 5, 0, Math.PI * 2);
      ctx.fillStyle = levelColors[i];
      ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.font = "11px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(labels[i], legendX + i * 80 + 10, legendY + 4);
    }
  }, [layoutDone, edgeList, height, selectedNodeId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const simNodes = simNodesRef.current;
    let found = false;
    for (const n of simNodes) {
      const dx = n.x - mx, dy = n.y - my;
      if (dx * dx + dy * dy < (n.size + 4) * (n.size + 4)) {
        const cit = nodes.get(n.id)?.work.TC ?? 0;
        setTooltip({
          x: mx + 12,
          y: my - 12,
          text: `${n.label}\n${cit} citações`,
        });
        found = true;
        break;
      }
    }
    if (!found) setTooltip(null);
  }, [nodes]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onNodeClick) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const simNodes = simNodesRef.current;
    for (const n of simNodes) {
      const dx = n.x - mx, dy = n.y - my;
      if (dx * dx + dy * dy < (n.size + 4) * (n.size + 4)) {
        onNodeClick(n.id);
        return;
      }
    }
  }, [onNodeClick]);

  if (nodes.size === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {!layoutDone && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Calculando layout...
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        onClick={handleClick}
        className="w-full h-full cursor-pointer"
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-popover text-popover-foreground border rounded-md px-2.5 py-1.5 text-xs shadow-md z-10 whitespace-pre-line max-w-64"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

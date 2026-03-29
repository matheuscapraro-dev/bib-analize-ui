"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import type { NetworkData } from "@/types/bibliometric";
import { CHART_PALETTE_HEX, paletteHex } from "@/lib/chart-config";

interface NetworkGraphProps {
  data: NetworkData;
  height?: number;
  width?: number;
}

interface SimNode {
  id: string;
  label: string;
  size: number;
  community: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function NetworkGraph({ data, height = 500, width: propWidth }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [layoutDone, setLayoutDone] = useState(false);

  const edges = useMemo(() => data.edges, [data]);
  useMemo(() => {
    const maxSize = Math.max(...data.nodes.map((n) => n.size), 1);
    nodesRef.current = data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      size: 4 + (n.size / maxSize) * 20,
      community: n.community,
      x: Math.random() * 600 - 300,
      y: Math.random() * 400 - 200,
      vx: 0,
      vy: 0,
    }));
    setLayoutDone(false);
  }, [data]);

  // Async force layout
  useEffect(() => {
    const simNodes = nodesRef.current;
    if (!simNodes.length) return;
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    let iter = 0;
    const totalIters = 120;
    const batchSize = 10;
    let rafId: number;

    function step() {
      const end = Math.min(iter + batchSize, totalIters);
      for (; iter < end; iter++) {
        const temp = 1 - iter / totalIters;
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const a = simNodes[i], b = simNodes[j];
            let dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (150 * temp) / dist;
            dx = (dx / dist) * force;
            dy = (dy / dist) * force;
            a.vx += dx; a.vy += dy;
            b.vx -= dx; b.vy -= dy;
          }
        }
        for (const e of edges) {
          const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
          if (!a || !b) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = dist * 0.005 * temp;
          a.vx += (dx / dist) * force;
          a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force;
          b.vy -= (dy / dist) * force;
        }
        for (const n of simNodes) {
          n.vx -= n.x * 0.01 * temp;
          n.vy -= n.y * 0.01 * temp;
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
  }, [data, edges]);

  // Draw
  useEffect(() => {
    if (!layoutDone) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const simNodes = nodesRef.current;
    const w = propWidth ?? containerRef.current?.clientWidth ?? 800;
    const h = height;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(2, 2);

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

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
    const pad = 40;
    for (const n of simNodes) {
      n.x = pad + ((n.x - minX) / rangeX) * (w - 2 * pad);
      n.y = pad + ((n.y - minY) / rangeY) * (h - 2 * pad);
    }

    ctx.clearRect(0, 0, w, h);

    // Detect dark mode
    const isDark = document.documentElement.classList.contains("dark");

    // Edges
    ctx.strokeStyle = isDark ? "rgba(200,200,220,0.12)" : "rgba(100,100,120,0.15)";
    ctx.lineWidth = 0.5;
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Nodes with community colors from resolved hex palette
    for (const n of simNodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fillStyle = paletteHex(n.community);
      ctx.fill();
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Labels for top nodes
    const labelColor = isDark ? "#e2e8f0" : "#1e293b";
    ctx.fillStyle = labelColor;
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    const topNodes = simNodes.slice().sort((a, b) => b.size - a.size).slice(0, 25);
    for (const n of topNodes) {
      // subtle background for readability
      const text = n.label;
      const metrics = ctx.measureText(text);
      const tx = n.x;
      const ty = n.y - n.size - 5;
      ctx.fillStyle = isDark ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.8)";
      ctx.fillRect(tx - metrics.width / 2 - 3, ty - 8, metrics.width + 6, 14);
      ctx.fillStyle = labelColor;
      ctx.fillText(text, tx, ty);
    }
  }, [layoutDone, edges, height, propWidth]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const simNodes = nodesRef.current;
    for (const n of simNodes) {
      const dx = n.x - mx, dy = n.y - my;
      if (dx * dx + dy * dy < (n.size + 4) * (n.size + 4)) {
        setTooltip({ x: mx + 12, y: my - 12, text: `${n.label} (${Math.round(n.size)})` });
        return;
      }
    }
    setTooltip(null);
  }, []);

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
      <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)} className="w-full h-full" />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-popover text-popover-foreground border rounded-md px-2 py-1 text-xs shadow-md z-10"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

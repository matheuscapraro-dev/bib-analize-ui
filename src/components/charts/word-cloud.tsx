"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { CHART_PALETTE_HEX } from "@/lib/chart-config";

interface WordCloudProps {
  words: { text: string; value: number }[];
  height?: number;
}

interface PlacedWord {
  text: string;
  value: number;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  color: string;
}

/** Grid-based spatial index for O(1) average collision detection */
class SpatialGrid {
  private cells = new Map<string, { x: number; y: number; w: number; h: number }[]>();
  constructor(private cellSize: number) {}

  private key(cx: number, cy: number) {
    return `${cx},${cy}`;
  }

  insert(rect: { x: number; y: number; w: number; h: number }) {
    const x1 = Math.floor((rect.x - rect.w / 2) / this.cellSize);
    const x2 = Math.floor((rect.x + rect.w / 2) / this.cellSize);
    const y1 = Math.floor((rect.y - rect.h / 2) / this.cellSize);
    const y2 = Math.floor((rect.y + rect.h / 2) / this.cellSize);
    for (let cx = x1; cx <= x2; cx++) {
      for (let cy = y1; cy <= y2; cy++) {
        const k = this.key(cx, cy);
        const cell = this.cells.get(k);
        if (cell) cell.push(rect);
        else this.cells.set(k, [rect]);
      }
    }
  }

  collides(x: number, y: number, w: number, h: number): boolean {
    const x1 = Math.floor((x - w / 2) / this.cellSize);
    const x2 = Math.floor((x + w / 2) / this.cellSize);
    const y1 = Math.floor((y - h / 2) / this.cellSize);
    const y2 = Math.floor((y + h / 2) / this.cellSize);
    const checked = new Set<{ x: number; y: number; w: number; h: number }>();
    for (let cx = x1; cx <= x2; cx++) {
      for (let cy = y1; cy <= y2; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (!cell) continue;
        for (const o of cell) {
          if (checked.has(o)) continue;
          checked.add(o);
          if (
            x - w / 2 < o.x + o.w / 2 &&
            x + w / 2 > o.x - o.w / 2 &&
            y - h / 2 < o.y + o.h / 2 &&
            y + h / 2 > o.y - o.h / 2
          ) return true;
        }
      }
    }
    return false;
  }
}

export function WordCloud({ words, height = 400 }: WordCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const placed = useMemo(() => {
    if (!words.length) return [];
    const sorted = words.slice().sort((a, b) => b.value - a.value).slice(0, 80);
    const maxVal = sorted[0].value;
    const minVal = sorted[sorted.length - 1].value;
    const range = maxVal - minVal || 1;

    const result: PlacedWord[] = [];
    const grid = new SpatialGrid(50);
    const centerX = 400;
    const centerY = height / 2;

    for (let i = 0; i < sorted.length; i++) {
      const w = sorted[i];
      const fontSize = 12 + ((w.value - minVal) / range) * 36;
      const rotation = i > 5 && Math.random() > 0.7 ? -90 : 0;
      const color = CHART_PALETTE_HEX[i % CHART_PALETTE_HEX.length];

      let placed_ = false;
      for (let t = 0; t < 500 && !placed_; t++) {
        const angle = t * 0.15;
        const radius = t * 0.6;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const approxW = w.text.length * fontSize * 0.55;
        const approxH = fontSize * 1.3;
        const rw = rotation ? approxH : approxW;
        const rh = rotation ? approxW : approxH;

        if (!grid.collides(x, y, rw, rh)) {
          result.push({ text: w.text, value: w.value, x, y, fontSize, rotation, color });
          grid.insert({ x, y, w: rw + 4, h: rh + 2 });
          placed_ = true;
        }
      }
    }
    return result;
  }, [words, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = containerRef.current?.clientWidth ?? 800;
    canvas.width = w * 2;
    canvas.height = height * 2;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, w, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const pw of placed) {
      ctx.save();
      ctx.translate(pw.x, pw.y);
      if (pw.rotation) ctx.rotate((pw.rotation * Math.PI) / 180);
      ctx.font = `${pw.fontSize}px sans-serif`;
      ctx.fillStyle = pw.color;
      ctx.fillText(pw.text, 0, 0);
      ctx.restore();
    }
  }, [placed, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const p of placed) {
      const approxW = p.text.length * p.fontSize * 0.55;
      const approxH = p.fontSize * 1.3;
      if (Math.abs(mx - p.x) < approxW / 2 && Math.abs(my - p.y) < approxH / 2) {
        setTooltip({ x: mx + 10, y: my - 10, text: `${p.text}: ${p.value}` });
        return;
      }
    }
    setTooltip(null);
  }, [placed]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
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

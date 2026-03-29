"use client";

import { useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ChartExportButtonProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  fileName?: string;
}

export function ChartExportButton({ chartRef, fileName = "chart" }: ChartExportButtonProps) {
  const handleExport = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const isDark = document.documentElement.classList.contains("dark");
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      console.error("Failed to export chart");
    }
  }, [chartRef, fileName]);

  return (
    <Button variant="ghost" size="icon" onClick={handleExport} title="Exportar gráfico como PNG">
      <Download className="size-4" />
    </Button>
  );
}

export function useChartRef() {
  return useRef<HTMLDivElement>(null);
}

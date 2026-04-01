"use client";

import type { OverlapResult } from "@/lib/comparison/types";
import type { ComparisonDataset } from "@/lib/comparison/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";

interface OverlapDisplayProps {
  result: OverlapResult;
  datasets: ComparisonDataset[];
  label?: string;
  className?: string;
}

export function OverlapDisplay({ result, datasets, label = "itens", className }: OverlapDisplayProps) {
  const jaccardPct = Math.round(result.jaccard * 1000) / 10;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="py-3">
          <CardContent className="px-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{formatNumber(result.union)}</p>
            <p className="text-xs text-muted-foreground">Total únicos</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-primary">{formatNumber(result.shared.length)}</p>
            <p className="text-xs text-muted-foreground">Em comum</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{jaccardPct}%</p>
            <p className="text-xs text-muted-foreground">Índice Jaccard</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{datasets.length}</p>
            <p className="text-xs text-muted-foreground">Datasets</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-dataset breakdown */}
      <div className="grid gap-3 sm:grid-cols-2">
        {datasets.map((ds, i) => (
          <div key={ds.id} className="flex items-center gap-3 rounded-lg border p-3">
            <span
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: ds.colorHex }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{ds.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(result.counts[i])} {label} total &bull;{" "}
                <span className="text-foreground font-medium">
                  {formatNumber(result.exclusive[i]?.length ?? 0)} exclusivos
                </span>
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {result.counts[i] > 0
                ? Math.round(((result.counts[i] - (result.exclusive[i]?.length ?? 0)) / result.counts[i]) * 100)
                : 0}% compartilhado
            </Badge>
          </div>
        ))}
      </div>

      {/* Shared items (show first 30) */}
      {result.shared.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            {label.charAt(0).toUpperCase() + label.slice(1)} em comum ({formatNumber(result.shared.length)})
          </p>
          <div className="flex flex-wrap gap-1">
            {result.shared.slice(0, 30).map((item) => (
              <Badge key={item} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
            {result.shared.length > 30 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{result.shared.length - 30} mais
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

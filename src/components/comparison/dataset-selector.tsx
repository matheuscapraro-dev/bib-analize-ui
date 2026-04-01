"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useComparison } from "@/store/comparison-context";
import { useSavedAnalyses } from "@/hooks/use-saved-analyses";
import type { BibWork, SavedAnalysis } from "@/types/bibliometric";
import { DATASET_COLORS, MAX_DATASETS } from "@/lib/comparison/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Database,
  FileText,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

export function DatasetSelector() {
  const { datasets, addDataset, removeDataset, clearAll, canAdd, isReady, loading: compLoading } = useComparison();
  const { analyses, loading: listLoading, load } = useSavedAnalyses();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const selectedIds = new Set(datasets.map((d) => d.id));

  const handleAdd = async (a: SavedAnalysis) => {
    if (!canAdd || selectedIds.has(a.id)) return;
    setLoadingId(a.id);
    try {
      const record = await load(a.id);
      if (!record) {
        toast.error("Análise não encontrada.");
        return;
      }
      addDataset(record.id, record.name, record.source, record.works as BibWork[]);
      toast.success(`"${record.name}" adicionada à comparação.`);
    } catch {
      toast.error("Erro ao carregar análise.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected datasets */}
      {datasets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Datasets selecionados ({datasets.length}/{MAX_DATASETS})</p>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={clearAll}>
              <Trash2 className="size-3 mr-1" />
              Limpar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {datasets.map((ds) => (
              <Badge
                key={ds.id}
                variant="secondary"
                className="gap-1.5 py-1 pl-2.5 pr-1 text-sm"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ds.colorHex }}
                />
                <span className="truncate max-w-[180px]">{ds.name}</span>
                <span className="text-muted-foreground text-xs">
                  ({ds.worksCount.toLocaleString("pt-BR")})
                </span>
                <button
                  onClick={() => removeDataset(ds.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Available analyses to add */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {canAdd ? "Selecione análises para comparar" : "Máximo de datasets atingido"}
        </p>

        {listLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" />
            Carregando análises salvas...
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>Nenhuma análise salva encontrada.</p>
            <p className="mt-1 text-xs">Faça uma busca ou upload e salve a análise primeiro.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[280px]">
            <div className="grid gap-2 sm:grid-cols-2 pr-2">
              {analyses.map((a) => {
                const isSelected = selectedIds.has(a.id);
                const isLoading = loadingId === a.id;
                const colorIdx = isSelected
                  ? datasets.findIndex((d) => d.id === a.id)
                  : -1;

                return (
                  <Card
                    key={a.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "ring-2 ring-offset-2 bg-accent/30"
                        : canAdd
                          ? "hover:bg-accent/50"
                          : "opacity-50 cursor-not-allowed"
                    }`}
                    style={
                      isSelected && colorIdx >= 0
                        ? { borderColor: DATASET_COLORS[colorIdx].hex }
                        : undefined
                    }
                    onClick={() => {
                      if (isSelected) removeDataset(a.id);
                      else handleAdd(a);
                    }}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm font-medium truncate flex items-center gap-1.5">
                            {isLoading && <Loader2 className="size-3 animate-spin" />}
                            {isSelected && colorIdx >= 0 && (
                              <span
                                className="size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: DATASET_COLORS[colorIdx].hex }}
                              />
                            )}
                            {a.name}
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {a.worksCount.toLocaleString("pt-BR")} registros
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {a.source === "openalex" ? (
                            <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                              <Database className="size-2.5" />
                              OA
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                              <FileText className="size-2.5" />
                              WoS
                            </Badge>
                          )}
                          {isSelected ? (
                            <Check className="size-4 text-primary" />
                          ) : canAdd ? (
                            <Plus className="size-4 text-muted-foreground" />
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Readiness message */}
      {datasets.length === 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Selecione pelo menos mais uma análise para iniciar a comparação.
        </p>
      )}
    </div>
  );
}

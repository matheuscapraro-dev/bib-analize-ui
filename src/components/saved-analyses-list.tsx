"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useBib } from "@/store/bibliometric-context";
import { useSavedAnalyses } from "@/hooks/use-saved-analyses";
import type { BibWork } from "@/types/bibliometric";
import type { SavedAnalysis } from "@/types/bibliometric";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bookmark,
  Database,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? "es" : ""}`;
}

export function SavedAnalysesList() {
  const router = useRouter();
  const { setData, setLoading, setSavedId } = useBib();
  const { analyses, loading, load, remove, rename } = useSavedAnalyses();

  const [deleteTarget, setDeleteTarget] = useState<SavedAnalysis | null>(null);
  const [renameTarget, setRenameTarget] = useState<SavedAnalysis | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleLoad = async (a: SavedAnalysis) => {
    setLoadingId(a.id);
    setLoading(true);
    try {
      const record = await load(a.id);
      if (!record) {
        toast.error("Análise não encontrada.");
        return;
      }
      setData(record.works as BibWork[], record.source, record.fileName, record.searchParams ?? undefined);
      setSavedId(record.id);
      toast.success(`"${record.name}" carregada.`);
      router.push("/analise");
    } catch {
      toast.error("Erro ao carregar análise.");
    } finally {
      setLoading(false);
      setLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success("Análise removida.");
    } catch {
      toast.error("Erro ao remover.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await rename(renameTarget.id, renameValue.trim());
      toast.success("Nome atualizado.");
    } catch {
      toast.error("Erro ao renomear.");
    } finally {
      setRenameTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  if (!analyses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Bookmark className="size-12 mb-4 opacity-30" />
        <p className="font-medium">Nenhuma análise salva</p>
        <p className="text-sm mt-1">
          Faça uma busca ou upload e salve a análise para acessá-la depois.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {analyses.map((a) => (
          <Card
            key={a.id}
            className="cursor-pointer transition-colors hover:bg-accent/50 group relative"
            onClick={() => handleLoad(a)}
          >
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-medium truncate">
                    {loadingId === a.id && <Loader2 className="size-3 animate-spin inline mr-1.5" />}
                    {a.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {a.worksCount.toLocaleString("pt-BR")} registros &bull; {timeAgo(a.updatedAt)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.source === "openalex" ? (
                    <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                      <Database className="size-2.5" />
                      OpenAlex
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                      <FileText className="size-2.5" />
                      Upload
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameTarget(a);
                          setRenameValue(a.name);
                        }}
                      >
                        <Pencil className="size-3.5 mr-2" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(a)}
                      >
                        <Trash2 className="size-3.5 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir análise</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &ldquo;{deleteTarget?.name}&rdquo;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear análise</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useBib } from "@/store/bibliometric-context";
import { useSavedAnalyses } from "@/hooks/use-saved-analyses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bookmark, BookmarkCheck, Loader2, Database, FileText } from "lucide-react";

interface SaveAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveAnalysisDialog({ open, onOpenChange }: SaveAnalysisDialogProps) {
  const { works, source, fileName, searchParams, savedId, setSavedId } = useBib();
  const { save } = useSavedAnalyses();

  const defaultName = fileName ?? (source === "openalex" ? "Busca OpenAlex" : "Upload");
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  // Reset name when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) setName(savedId ? name : defaultName);
    onOpenChange(v);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning("Digite um nome para a análise.");
      return;
    }
    setSaving(true);
    try {
      const saved = await save(
        {
          id: savedId ?? undefined,
          name: trimmed,
          source: source!,
          fileName: fileName ?? undefined,
          searchParams: searchParams ?? undefined,
        },
        works,
      );
      setSavedId(saved.id);
      toast.success(savedId ? "Análise atualizada!" : "Análise salva!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar análise.");
    } finally {
      setSaving(false);
    }
  };

  const isUpdate = !!savedId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpdate ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
            {isUpdate ? "Atualizar Análise" : "Salvar Análise"}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Atualize os dados da análise salva anteriormente."
              : "Salve esta análise para acessá-la depois sem precisar buscar novamente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="analysis-name">Nome</Label>
            <Input
              id="analysis-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da análise"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {source === "openalex" ? (
              <Badge variant="outline" className="gap-1">
                <Database className="size-3" />
                OpenAlex
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <FileText className="size-3" />
                Upload
              </Badge>
            )}
            <span>{works.length.toLocaleString("pt-BR")} registros</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : isUpdate ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {saving ? "Salvando..." : isUpdate ? "Atualizar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

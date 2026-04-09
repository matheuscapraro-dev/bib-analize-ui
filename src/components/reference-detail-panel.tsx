"use client";

import { ExternalLink, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { RefNode } from "@/store/reference-context";

interface ReferenceDetailPanelProps {
  node: RefNode | null;
  open: boolean;
  onClose: () => void;
  onExpand: (id: string) => void;
}

const LEVEL_LABELS: Record<number, string> = {
  0: "Semente",
  1: "Nível 1",
  2: "Nível 2",
};

const LEVEL_COLORS: Record<number, string> = {
  0: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  1: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  2: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
};

export function ReferenceDetailPanel({ node, open, onClose, onExpand }: ReferenceDetailPanelProps) {
  if (!node) return null;

  const { work, level, expanded, loading } = node;
  const doi = work.DI ? `https://doi.org/${work.DI}` : null;
  const oaId = work.UT ?? "";
  const oaUrl = oaId ? `https://openalex.org/${oaId}` : null;
  const refIds = (work._REF_IDS as string[] | undefined) ?? [];
  const canExpand = level < 2 && !expanded && refIds.length > 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-base font-semibold leading-tight pr-8">
              {String(work.TI ?? "Sem título")}
            </SheetTitle>
            <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-2" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className={LEVEL_COLORS[level]}>
              {LEVEL_LABELS[level] ?? `Nível ${level}`}
            </Badge>
            {work.PY ? <Badge variant="secondary">{work.PY}</Badge> : null}
            {work.TC != null && <Badge variant="secondary">{work.TC} citações</Badge>}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-14rem)]">
          <div className="px-6 py-4 space-y-4">
            {/* Authors */}
            {work.AU && (
              <Section label="Autores">
                <p className="text-sm">{work.AU}</p>
              </Section>
            )}

            {/* Journal */}
            {work.SO && (
              <Section label="Fonte">
                <p className="text-sm">{work.SO}</p>
              </Section>
            )}

            {/* Metrics */}
            <Section label="Métricas">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {work.TC != null && <Kv label="Citações" value={String(work.TC)} />}
                {work._FWCI != null && <Kv label="FWCI" value={(work._FWCI as number).toFixed(2)} />}
                {work._CITE_PERCENTILE != null && (
                  <Kv label="Percentil" value={`${((work._CITE_PERCENTILE as number) * 100).toFixed(0)}%`} />
                )}
                {work.NR != null && <Kv label="Referências" value={String(work.NR)} />}
              </div>
            </Section>

            {/* Abstract */}
            {work.AB && (
              <Section label="Abstract">
                <p className="text-sm text-muted-foreground leading-relaxed">{work.AB}</p>
              </Section>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-2">
              {doi && (
                <Button variant="outline" size="sm" asChild>
                  <a href={doi} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5 mr-1.5" />
                    DOI
                  </a>
                </Button>
              )}
              {oaUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={oaUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5 mr-1.5" />
                    OpenAlex
                  </a>
                </Button>
              )}
            </div>

            {/* Expand button */}
            {canExpand && (
              <Button
                className="w-full"
                onClick={() => onExpand(node.id)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="size-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Carregando referências...
                  </>
                ) : (
                  <>
                    <Expand className="size-4 mr-2" />
                    Expandir referências ({refIds.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</h4>
      {children}
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
    </div>
  );
}

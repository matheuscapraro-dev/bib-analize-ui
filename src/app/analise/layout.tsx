"use client";

import { useRouter } from "next/navigation";
import { useBib } from "@/store/bibliometric-context";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalFilters } from "@/components/global-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { ArrowLeft, Bookmark, BookmarkCheck, Database, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { SaveAnalysisDialog } from "@/components/save-analysis-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function AnaliseLayout({ children }: { children: React.ReactNode }) {
  const { works, source, fileName, savedId } = useBib();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    if (!works.length) router.replace("/");
  }, [works.length, router]);

  if (!works.length) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar className="hidden lg:flex" />

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-60">
          <AppSidebar className="flex w-full border-none" />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-12 items-center gap-2 border-b px-4 shrink-0">
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/")}>
            <ArrowLeft className="size-4" />
          </Button>
          <Database className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">
            {source === "openalex" ? "OpenAlex" : source === "wos" ? "Web of Science" : "Web of Science (Upload)"}
          </span>
          {fileName && <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {fileName}</span>}
          <Badge variant="secondary" className="ml-auto shrink-0">{works.length} registros</Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={savedId ? "secondary" : "outline"} size="sm" className="gap-1.5 text-xs" onClick={() => setSaveOpen(true)}>
                {savedId ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
                <span className="hidden sm:inline">{savedId ? "Salvo" : "Salvar"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{savedId ? "Atualizar análise salva" : "Salvar análise"}</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push("/")}>
            Nova análise
          </Button>
        </header>
        {/* Filters */}
        <div className="border-b px-4 py-2 shrink-0">
          <GlobalFilters />
        </div>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <SaveAnalysisDialog open={saveOpen} onOpenChange={setSaveOpen} />
    </div>
  );
}

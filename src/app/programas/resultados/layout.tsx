"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgramProvider, usePrograms } from "@/store/program-context";
import { ProgramSidebar } from "@/components/program/program-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ArrowLeft, GraduationCap, Menu } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import type { BibWork, JournalMetrics } from "@/types/bibliometric";

function DataLoader({ children }: { children: React.ReactNode }) {
  const { programs, addProgram, setJournalMetrics, setError } = usePrograms();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (programs.length > 0) {
      setLoaded(true);
      return;
    }

    try {
      const raw = sessionStorage.getItem("programas-data");
      if (!raw) {
        router.replace("/programas");
        return;
      }
      const data = JSON.parse(raw);

      // Restore programs
      for (const pw of data.programWorks ?? []) {
        const meta = (data.programs as {
          id: string;
          name: string;
          affiliationSearch: string;
          searchMode?: string;
          authorIds?: string;
        }[]).find((p) => p.id === pw.id);
        if (!meta) continue;
        addProgram({
          id: pw.id,
          name: meta.name,
          source: data.dataSource ?? "openalex",
          works: pw.works as BibWork[],
          programName: meta.name,
          affiliationSearch: meta.affiliationSearch ?? "",
          institutionId: data.institution?.id ?? "",
          institutionName: data.institution?.display_name ?? "",
          searchMode: (meta.searchMode as "affiliation" | "authorIds") ?? "affiliation",
          authorIds: meta.authorIds ?? "",
        });
      }

      // Restore journal metrics
      if (data.journalMetrics) {
        const map = new Map<string, JournalMetrics>(data.journalMetrics);
        setJournalMetrics(map);
      }

      setLoaded(true);
    } catch (err) {
      setError("Erro ao carregar dados dos programas.");
      router.replace("/programas");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProgramLayoutInner({ children }: { children: React.ReactNode }) {
  const { programs } = usePrograms();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ProgramSidebar className="hidden lg:flex" />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-60">
          <ProgramSidebar className="flex w-full border-none" />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-12 items-center gap-2 border-b px-4 shrink-0">
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/programas")}>
            <ArrowLeft className="size-4" />
          </Button>
          <GraduationCap className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Programas de Pós-Graduação</span>
          <div className="ml-auto flex items-center gap-2">
            {programs.map((ds) => (
              <Badge
                key={ds.id}
                variant="secondary"
                className="gap-1.5 text-xs hidden sm:flex"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: ds.colorHex }}
                />
                {ds.programName}
                <span className="text-muted-foreground">({ds.worksCount})</span>
              </Badge>
            ))}
            {programs.length > 0 && (
              <Badge variant="outline" className="text-xs sm:hidden">
                {programs.length} programas
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push("/")}>
            Início
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <ErrorBoundary>
            <DataLoader>{children}</DataLoader>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function ProgramasResultadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProgramProvider>
      <ProgramLayoutInner>{children}</ProgramLayoutInner>
    </ProgramProvider>
  );
}

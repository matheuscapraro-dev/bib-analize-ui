"use client";

import { useRouter } from "next/navigation";
import { ComparisonProvider, useComparison } from "@/store/comparison-context";
import { ComparisonSidebar } from "@/components/comparison/comparison-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ArrowLeft, GitCompareArrows, Menu } from "lucide-react";
import { useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";

function ComparisonLayoutInner({ children }: { children: React.ReactNode }) {
  const { datasets } = useComparison();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ComparisonSidebar className="hidden lg:flex" />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-60">
          <ComparisonSidebar className="flex w-full border-none" />
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
          <GitCompareArrows className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Comparação de Análises</span>
          <div className="ml-auto flex items-center gap-2">
            {datasets.map((ds) => (
              <Badge
                key={ds.id}
                variant="secondary"
                className="gap-1.5 text-xs hidden sm:flex"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: ds.colorHex }}
                />
                {ds.name}
              </Badge>
            ))}
            {datasets.length > 0 && (
              <Badge variant="outline" className="text-xs sm:hidden">
                {datasets.length} datasets
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
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function CompararLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComparisonProvider>
      <ComparisonLayoutInner>{children}</ComparisonLayoutInner>
    </ComparisonProvider>
  );
}

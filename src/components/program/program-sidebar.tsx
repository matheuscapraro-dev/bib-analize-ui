"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  Globe,
  Hash,
  LayoutDashboard,
  LineChart,
  Network,
  Newspaper,
  Quote,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const NAV_ITEMS = [
  { href: "/programas/resultados", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/programas/resultados/qualis", label: "Qualis / Produção", icon: Award },
  { href: "/programas/resultados/producao", label: "Produção Temporal", icon: LineChart },
  { href: "/programas/resultados/citacoes", label: "Citações & h-Index", icon: Quote },
  { href: "/programas/resultados/autores", label: "Autores", icon: Users },
  { href: "/programas/resultados/fontes", label: "Fontes", icon: Newspaper },
  { href: "/programas/resultados/tematico", label: "Temático", icon: Hash },
  { href: "/programas/resultados/geografico", label: "Geográfico", icon: Globe },
  { href: "/programas/resultados/colaboracao", label: "Colaboração & Redes", icon: Network },
  { href: "/programas/resultados/impacto", label: "Impacto", icon: TrendingUp },
  { href: "/programas/resultados/diversidade", label: "Diversidade", icon: BookOpen },
  { href: "/programas/resultados/lotka-bradford", label: "Lotka & Bradford", icon: BarChart3 },
  { href: "/programas/resultados/referencias", label: "Base Intelectual", icon: BookMarked },
] as const;

interface ProgramSidebarProps {
  className?: string;
}

export function ProgramSidebar({ className }: ProgramSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex flex-col w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="size-5 text-sidebar-primary" />
          <span>BibAnalize</span>
        </Link>
      </div>
      <div className="px-4 py-2 border-b">
        <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Programas de Pós-Graduação
        </p>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

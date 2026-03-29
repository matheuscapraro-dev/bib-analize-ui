"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BookOpen, Building2, FileText, Globe, Hash,
  LayoutDashboard, Library, LineChart, MapPin, Network,
  Sparkles, TrendingUp, Users, Newspaper, DollarSign, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const NAV_ITEMS = [
  { href: "/analise", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/analise/producao-anual", label: "Produção Anual", icon: LineChart },
  { href: "/analise/fontes", label: "Fontes", icon: Newspaper },
  { href: "/analise/autores", label: "Autores", icon: Users },
  { href: "/analise/instituicoes", label: "Instituições", icon: Building2 },
  { href: "/analise/paises", label: "Países", icon: MapPin },
  { href: "/analise/palavras-chave", label: "Palavras-chave", icon: Hash },
  { href: "/analise/citacoes", label: "Citações", icon: TrendingUp },
  { href: "/analise/colaboracao", label: "Colaboração", icon: Network },
  { href: "/analise/open-access", label: "Open Access", icon: BookOpen },
  { href: "/analise/tipos-documento", label: "Tipos de Documento", icon: FileText },
  { href: "/analise/idiomas", label: "Idiomas", icon: Globe },
  { href: "/analise/areas", label: "Áreas do Conhecimento", icon: Library },
  { href: "/analise/financiamento", label: "Financiamento", icon: DollarSign },
  { href: "/analise/lotka-bradford", label: "Lotka & Bradford", icon: BarChart3 },
  { href: "/analise/artigos", label: "Explorador de Artigos", icon: Search },
  { href: "/analise/resumo", label: "Resumo & Exportação", icon: Sparkles },
] as const;

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex flex-col w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="size-5 text-sidebar-primary" />
          <span>BibAnalize</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/analise" && pathname.startsWith(href + "/"));
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

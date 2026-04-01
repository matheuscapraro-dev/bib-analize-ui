"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Building2,
  Globe,
  Hash,
  LayoutDashboard,
  Library,
  LineChart,
  Sparkles,
  TrendingUp,
  Users,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const NAV_ITEMS = [
  { href: "/comparar", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/comparar/producao", label: "Produção Temporal", icon: LineChart },
  { href: "/comparar/autores", label: "Autores", icon: Users },
  { href: "/comparar/fontes", label: "Fontes", icon: Newspaper },
  { href: "/comparar/tematico", label: "Temático", icon: Hash },
  { href: "/comparar/geografico", label: "Geográfico", icon: Globe },
  { href: "/comparar/impacto", label: "Impacto", icon: TrendingUp },
  { href: "/comparar/diversidade", label: "Diversidade", icon: BookOpen },
] as const;

interface ComparisonSidebarProps {
  className?: string;
}

export function ComparisonSidebar({ className }: ComparisonSidebarProps) {
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
          Comparação
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

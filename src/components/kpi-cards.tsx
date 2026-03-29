"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  description?: string;
  className?: string;
}

export function KpiCard({ title, value, icon, description, className }: KpiCardProps) {
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="flex items-center gap-4 px-4">
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl font-bold tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</p>
          {description && <p className="text-muted-foreground text-xs mt-0.5 truncate">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

interface KpiGridProps {
  children: ReactNode;
  className?: string;
}

export function KpiGrid({ children, className }: KpiGridProps) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", className)}>{children}</div>;
}

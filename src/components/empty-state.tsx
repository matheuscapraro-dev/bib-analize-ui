import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message?: string;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ message = "Sem dados suficientes.", icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12 text-center", className)}>
      {icon && <div className="text-muted-foreground opacity-50">{icon}</div>}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

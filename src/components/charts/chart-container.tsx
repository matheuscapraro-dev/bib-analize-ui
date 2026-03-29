"use client";

import { forwardRef, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartExportButton } from "@/components/chart-export-button";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  function ChartContainer({ title, description, children, actions, className }, ref) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </CardHeader>
        <CardContent>
          <div ref={ref}>{children}</div>
        </CardContent>
      </Card>
    );
  },
);

export { ChartExportButton };

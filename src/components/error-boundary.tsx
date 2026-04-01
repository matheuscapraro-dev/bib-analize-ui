"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <AlertCircle className="size-10 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold">Ocorreu um erro</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Ocorreu um erro ao exibir esta seção. Tente recarregar a página.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">{this.state.error.message}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

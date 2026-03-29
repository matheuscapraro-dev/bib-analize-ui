"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TopNSelectorProps {
  value: number;
  onChange: (n: number) => void;
  options?: number[];
}

const DEFAULT_OPTIONS = [10, 20, 30, 50];

export function TopNSelector({ value, onChange, options = DEFAULT_OPTIONS }: TopNSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs">Top</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-20 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((n) => (
            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

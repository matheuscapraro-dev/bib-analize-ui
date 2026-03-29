"use client";

import { useBib } from "@/store/bibliometric-context";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, RotateCcw, Search } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start" sideOffset={4} collisionPadding={16}>
        {options.length > 6 && (
          <div className="mb-2">
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        )}
        <ScrollArea className="max-h-56 overflow-y-auto">
          <div className="flex flex-col gap-0.5 pr-2">
            {filtered.map((opt) => (
              <label key={opt} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent cursor-pointer">
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) => {
                    if (checked) onChange([...selected, opt]);
                    else onChange(selected.filter((s) => s !== opt));
                  }}
                />
                <span className="truncate">{opt}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">Nenhum resultado</p>}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function GlobalFilters() {
  const {
    works, filters, setFilters, resetFilters,
    availableYears, availableDocTypes, availableLanguages, availableOaStatuses,
  } = useBib();

  // Debounced local state for slider and search
  const [localYearRange, setLocalYearRange] = useState(filters.yearRange);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const yearTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync from context when filters reset
  useEffect(() => {
    setLocalYearRange(filters.yearRange);
    setLocalSearch(filters.search);
  }, [filters.yearRange, filters.search]);

  const debouncedSetYear = useCallback((v: [number, number]) => {
    setLocalYearRange(v);
    if (yearTimer.current) clearTimeout(yearTimer.current);
    yearTimer.current = setTimeout(() => setFilters({ yearRange: v }), 300);
  }, [setFilters]);

  const debouncedSetSearch = useCallback((v: string) => {
    setLocalSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setFilters({ search: v }), 300);
  }, [setFilters]);

  if (!works.length) return null;

  const minYear = availableYears[0] ?? 1900;
  const maxYear = availableYears[availableYears.length - 1] ?? new Date().getFullYear();
  const activeCount = (filters.docTypes.length > 0 ? 1 : 0) +
    (filters.languages.length > 0 ? 1 : 0) +
    (filters.oaStatuses.length > 0 ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.yearRange[0] > minYear || filters.yearRange[1] < maxYear ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      <Filter className="size-4 text-muted-foreground shrink-0" />

      {/* Year range */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <Label className="text-xs whitespace-nowrap">Ano</Label>
        <Slider
          min={minYear}
          max={maxYear}
          value={localYearRange}
          onValueChange={(v) => debouncedSetYear(v as [number, number])}
          step={1}
          className="w-32"
        />
        <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
          {localYearRange[0]}–{localYearRange[1]}
        </span>
      </div>

      {/* Multi-selects */}
      {availableDocTypes.length > 1 && (
        <MultiSelect
          label="Tipo"
          options={availableDocTypes}
          selected={filters.docTypes}
          onChange={(v) => setFilters({ docTypes: v })}
        />
      )}
      {availableLanguages.length > 1 && (
        <MultiSelect
          label="Idioma"
          options={availableLanguages}
          selected={filters.languages}
          onChange={(v) => setFilters({ languages: v })}
        />
      )}
      {availableOaStatuses.length > 1 && (
        <MultiSelect
          label="Acesso"
          options={availableOaStatuses}
          selected={filters.oaStatuses}
          onChange={(v) => setFilters({ oaStatuses: v })}
        />
      )}

      {/* Search */}
      <div className="relative ml-auto">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Pesquisar..."
          value={localSearch}
          onChange={(e) => debouncedSetSearch(e.target.value)}
          className="h-8 w-40 pl-7 text-xs"
        />
      </div>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-1 text-xs">
          <RotateCcw className="size-3" />
          Limpar ({activeCount})
        </Button>
      )}
    </div>
  );
}

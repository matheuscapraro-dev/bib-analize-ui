"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchTopics, type OpenAlexTopic } from "@/lib/openalex-api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, X, Tag, TextSearch } from "lucide-react";

interface TopicResolverProps {
  topic: string;
  topicIds: string[];
  topicFilterMode: "search" | "topics";
  email?: string;
  apiKey?: string;
  onTopicChange: (topic: string) => void;
  onTopicIdsChange: (ids: string[]) => void;
  onModeChange: (mode: "search" | "topics") => void;
}

export function TopicResolver({
  topic,
  topicIds,
  topicFilterMode,
  email,
  apiKey,
  onTopicChange,
  onTopicIdsChange,
  onModeChange,
}: TopicResolverProps) {
  const [suggestions, setSuggestions] = useState<OpenAlexTopic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<OpenAlexTopic[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 3) {
        setSuggestions([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchTopics(query, { email, apiKey });
        setSuggestions(results);
        setShowSuggestions(true);
      } finally {
        setSearching(false);
      }
    },
    [email, apiKey],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      onTopicChange(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (topicFilterMode === "topics") {
        debounceRef.current = setTimeout(() => handleSearch(value), 400);
      }
    },
    [onTopicChange, topicFilterMode, handleSearch],
  );

  const addTopic = useCallback(
    (t: OpenAlexTopic) => {
      if (topicIds.includes(t.id)) return;
      const next = [...selectedTopics, t];
      setSelectedTopics(next);
      onTopicIdsChange(next.map((x) => x.id));
      setShowSuggestions(false);
    },
    [topicIds, selectedTopics, onTopicIdsChange],
  );

  const removeTopic = useCallback(
    (id: string) => {
      const next = selectedTopics.filter((t) => t.id !== id);
      setSelectedTopics(next);
      onTopicIdsChange(next.map((x) => x.id));
    },
    [selectedTopics, onTopicIdsChange],
  );

  return (
    <div className="space-y-2 sm:col-span-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <Label>Tópico / Palavras-chave</Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={topicFilterMode === "topics" ? "default" : "outline"}
            className="h-6 text-xs px-2 gap-1"
            onClick={() => onModeChange("topics")}
            title="Filtra por tópicos classificados do OpenAlex (mais preciso)"
          >
            <Tag className="size-3" />
            Por tópico
          </Button>
          <Button
            type="button"
            size="sm"
            variant={topicFilterMode === "search" ? "default" : "outline"}
            className="h-6 text-xs px-2 gap-1"
            onClick={() => onModeChange("search")}
            title="Busca textual no título, resumo e corpo (pode retornar resultados menos relevantes)"
          >
            <TextSearch className="size-3" />
            Texto livre
          </Button>
        </div>
      </div>

      <div className="relative">
        <Input
          placeholder={
            topicFilterMode === "topics"
              ? "Digite para buscar tópicos classificados do OpenAlex..."
              : 'ex: "machine learning" AND healthcare'
          }
          value={topic}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (topicFilterMode === "topics" && suggestions.length > 0) setShowSuggestions(true);
          }}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && topicFilterMode === "topics" && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
            {suggestions.map((t) => {
              const shortId = t.id.replace("https://openalex.org/", "");
              const isSelected = topicIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={isSelected}
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0 disabled:opacity-40"
                  onClick={() => addTopic(t)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{t.display_name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {shortId}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {t.description}
                  </p>
                  <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{t.domain.display_name}</span>
                    <span>›</span>
                    <span>{t.field.display_name}</span>
                    <span>›</span>
                    <span>{t.subfield.display_name}</span>
                    <span className="ml-auto">{t.works_count.toLocaleString("pt-BR")} trabalhos</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected topics */}
      {topicFilterMode === "topics" && selectedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTopics.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
              <Tag className="size-3" />
              <span className="max-w-48 truncate">{t.display_name}</span>
              <button
                type="button"
                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                onClick={() => removeTopic(t.id)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Mode helper text */}
      <p className="text-xs text-muted-foreground">
        {topicFilterMode === "topics" ? (
          <>
            <strong>Modo Tópico:</strong> Filtra por classificação de tópico do OpenAlex (ML). Selecione tópicos da lista.
            {selectedTopics.length > 0 && topic && " O texto também será usado como busca complementar dentro dos tópicos."}
            {selectedTopics.length === 0 && " Digite pelo menos 3 caracteres para ver sugestões."}
          </>
        ) : (
          <>
            <strong>Modo Texto Livre:</strong> Busca fulltext no título, abstract e corpo do artigo. Pode retornar trabalhos que apenas mencionam o termo mas não são sobre o tópico.
            {" "}Suporta AND, OR, NOT e aspas para frase exata.
          </>
        )}
      </p>
    </div>
  );
}

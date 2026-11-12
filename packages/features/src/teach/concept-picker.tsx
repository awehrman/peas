"use client";

import type { ConceptRef, SearchConcepts } from "./types";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";

import { Badge, Input, Label, cn } from "@peas/components";
import { X } from "lucide-react";

const SEARCH_DEBOUNCE_MS = 250;

interface ConceptPickerProps {
  label: string;
  value: ConceptRef | null;
  onChange: (value: ConceptRef | null) => void;
  onSearch: SearchConcepts;
  placeholder?: string;
}

/**
 * Searchable combobox for one food concept (names and FOOD entries).
 *
 * @example
 * <ConceptPicker label="Concept" value={concept} onChange={setConcept} onSearch={searchConcepts} />
 */
export function ConceptPicker({
  label,
  value,
  onChange,
  onSearch,
  placeholder = "Search concepts",
}: ConceptPickerProps): ReactNode {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConceptRef[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    let isCancelled = false;
    const timeout = setTimeout(() => {
      onSearch(trimmed)
        .then((options) => {
          if (isCancelled) return;
          setResults(options);
          setActiveIndex(0);
          setIsOpen(true);
        })
        .catch(() => {
          if (!isCancelled) setResults([]);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [query, onSearch]);

  function choose(option: ConceptRef) {
    onChange(option);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = results[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const activeOption = results[activeIndex];
  const showResults = isOpen && results.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={inputId}>{label}</Label>
      {value ? (
        <div>
          <Badge variant="secondary" className="gap-1 pr-1">
            {value.canonicalName}
            <button
              type="button"
              aria-label={`Clear ${label.toLowerCase()} (${value.canonicalName})`}
              className="rounded-sm p-0.5 hover:bg-greyscale-200"
              onClick={() => onChange(null)}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </Badge>
        </div>
      ) : (
        <div className="relative">
          <Input
            id={inputId}
            role="combobox"
            aria-expanded={showResults}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showResults && activeOption
                ? `${listboxId}-${activeOption.id}`
                : undefined
            }
            value={query}
            placeholder={placeholder}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setIsOpen(false)}
            onFocus={() => setIsOpen(results.length > 0)}
          />
          <ul
            id={listboxId}
            role="listbox"
            aria-label={`${label} suggestions`}
            className={cn(
              "absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md",
              !showResults && "hidden"
            )}
          >
            {results.map((option, index) => (
              <li
                key={option.id}
                id={`${listboxId}-${option.id}`}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "cursor-pointer rounded-sm px-2 py-1 text-sm",
                  index === activeIndex && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
              >
                {option.canonicalName}
                {option.status === "PROPOSED" ? (
                  <span className="ml-2 text-xs text-greyscale-600">
                    (proposed)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

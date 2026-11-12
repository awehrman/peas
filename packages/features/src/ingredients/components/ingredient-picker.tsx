"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";

import { Label, UnderlineInput, cn } from "@peas/components";

import { RemovableList } from "../../shared";
import type { IngredientOption } from "../types";

export type SearchIngredients = (
  query: string,
  excludeId?: string
) => Promise<IngredientOption[]>;

const SEARCH_DEBOUNCE_MS = 250;

interface IngredientPickerProps {
  label: string;
  selected: IngredientOption[];
  onChange: (selected: IngredientOption[]) => void;
  onSearch: SearchIngredients;
  excludeId?: string;
  multiple?: boolean;
}

/**
 * Searchable combobox for picking one or more ingredients.
 */
export function IngredientPicker({
  label,
  selected,
  onChange,
  onSearch,
  excludeId,
  multiple = false,
}: IngredientPickerProps): ReactNode {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IngredientOption[]>([]);
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
      onSearch(trimmed, excludeId)
        .then((options) => {
          if (isCancelled) return;
          const selectedIds = new Set(selected.map((option) => option.id));
          setResults(options.filter((option) => !selectedIds.has(option.id)));
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
  }, [query, excludeId, onSearch, selected]);

  function choose(option: IngredientOption) {
    onChange(multiple ? [...selected, option] : [option]);
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
      <RemovableList
        label={`Selected ${label.toLowerCase()}`}
        items={selected.map((option) => ({ key: option.id, label: option.name }))}
        onRemove={(id) => onChange(selected.filter((item) => item.id !== id))}
      />
      {multiple || selected.length === 0 ? (
        <div className="relative">
          <UnderlineInput
            className="text-sm"
            id={inputId}
            role="combobox"
            aria-expanded={showResults}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showResults && activeOption ? `${listboxId}-${activeOption.id}` : undefined
            }
            value={query}
            placeholder="Search ingredients"
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
                {option.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

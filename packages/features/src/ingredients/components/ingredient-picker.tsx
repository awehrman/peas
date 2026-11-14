"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";

import { UnderlineInput, cn } from "@peas/components";

import { RemovableList } from "../../shared";
import type { IngredientOption } from "../types";

export type SearchIngredients = (
  query: string,
  excludeId?: string
) => Promise<IngredientOption[]>;

/** Adds a new food by name and returns it; throws with a readable message when it can't. */
export type CreateIngredientOption = (
  name: string
) => Promise<IngredientOption>;

type PickerChoice =
  | { kind: "existing"; option: IngredientOption }
  | { kind: "create"; name: string };

const SEARCH_DEBOUNCE_MS = 250;

interface IngredientPickerProps {
  label: string;
  selected: IngredientOption[];
  onChange: (selected: IngredientOption[]) => void;
  onSearch: SearchIngredients;
  excludeId?: string;
  multiple?: boolean;
  /** When set, a search with no exact match offers to add it as a new ingredient. */
  onCreate?: CreateIngredientOption;
  /** Hides the chips of already-picked ingredients (when the parent lists them itself). */
  hideSelected?: boolean;
  /** Focuses the search box on mount, e.g. right after a plus button reveals it. */
  autoFocus?: boolean;
  /** Called when the search box loses focus while empty, so a parent can collapse it again. */
  onDismiss?: () => void;
  /** Ingredients to leave out of the results besides the selected ones, e.g. existing base ingredients. */
  excludeIds?: readonly string[];
  /** At most this many results, closest first. */
  limit?: number;
}

/**
 * Searchable combobox for picking one or more ingredients, optionally adding a missing one.
 */
export function IngredientPicker({
  label,
  selected,
  onChange,
  onSearch,
  excludeId,
  multiple = false,
  onCreate,
  hideSelected = false,
  autoFocus = false,
  onDismiss,
  excludeIds,
  limit,
}: IngredientPickerProps): ReactNode {
  const excludeKey = (excludeIds ?? []).join(",");
  const selectedKey = selected.map((option) => option.id).join(",");
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const errorId = `${inputId}-error`;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IngredientOption[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchedQuery("");
      return;
    }

    let isCancelled = false;
    const timeout = setTimeout(() => {
      onSearch(trimmed, excludeId)
        .then((options) => {
          if (isCancelled) return;
          const hiddenIds = new Set(
            [selectedKey, excludeKey].flatMap((key) =>
              key ? key.split(",") : []
            )
          );
          const available = options.filter(
            (option) => !hiddenIds.has(option.id)
          );
          setResults(
            limit === undefined ? available : available.slice(0, limit)
          );
          setSearchedQuery(trimmed);
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
  }, [query, excludeId, onSearch, selectedKey, excludeKey, limit]);

  const lowerQuery = searchedQuery.toLowerCase();
  const canCreate =
    onCreate !== undefined &&
    searchedQuery !== "" &&
    searchedQuery === query.trim() &&
    !results.some((option) => option.name.toLowerCase() === lowerQuery) &&
    !selected.some((option) => option.name.toLowerCase() === lowerQuery);
  const choices: PickerChoice[] = [
    ...results.map((option) => ({ kind: "existing" as const, option })),
    ...(canCreate ? [{ kind: "create" as const, name: searchedQuery }] : []),
  ];

  function choose(option: IngredientOption) {
    onChange(multiple ? [...selected, option] : [option]);
    setQuery("");
    setResults([]);
    setSearchedQuery("");
    setIsOpen(false);
    setCreateError(null);
  }

  async function create(name: string) {
    if (!onCreate || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      choose(await onCreate(name));
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Could not add that ingredient"
      );
    } finally {
      setIsCreating(false);
    }
  }

  function pick(choice: PickerChoice) {
    if (choice.kind === "existing") choose(choice.option);
    else void create(choice.name);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || choices.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % choices.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + choices.length) % choices.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const choice = choices[activeIndex];
      if (choice) pick(choice);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const choiceId = (choice: PickerChoice) =>
    `${listboxId}-${choice.kind === "existing" ? choice.option.id : "create"}`;
  const activeChoice = choices[activeIndex];
  const showResults = isOpen && choices.length > 0;

  return (
    <div className="flex flex-col gap-1">
      {/* <Label htmlFor={inputId}>{label}</Label> */}
      {hideSelected ? null : (
        <RemovableList
          label={`Selected ${label.toLowerCase()}`}
          items={selected.map((option) => ({
            key: option.id,
            label: option.name,
          }))}
          onRemove={(id) => onChange(selected.filter((item) => item.id !== id))}
        />
      )}
      {multiple || selected.length === 0 ? (
        <div className="relative">
          <UnderlineInput
            className="text-sm"
            id={inputId}
            role="combobox"
            aria-label={label}
            aria-expanded={showResults}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showResults && activeChoice ? choiceId(activeChoice) : undefined
            }
            aria-invalid={createError ? true : undefined}
            aria-describedby={createError ? errorId : undefined}
            aria-busy={isCreating || undefined}
            value={query}
            placeholder={label}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            onBlur={() => {
              setIsOpen(false);
              if (!query.trim() && !isCreating) onDismiss?.();
            }}
            onFocus={() => setIsOpen(choices.length > 0)}
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
            {choices.map((choice, index) => (
              <li
                key={choiceId(choice)}
                id={choiceId(choice)}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "cursor-pointer rounded-sm px-2 py-1 text-sm",
                  choice.kind === "create" && "text-primary-700",
                  index === activeIndex && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(choice);
                }}
              >
                {choice.kind === "existing"
                  ? choice.option.name
                  : `Add “${choice.name}” as a new ingredient`}
              </li>
            ))}
          </ul>
          {createError ? (
            <p
              id={errorId}
              role="alert"
              className="mt-1 text-xs text-error-700"
            >
              {createError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

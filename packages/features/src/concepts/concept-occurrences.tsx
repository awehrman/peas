"use client";

import type {
  ConceptOccurrence,
  ConceptOccurrenceFilterOptions,
  ConceptOccurrenceFilters,
  ConceptOccurrencePage,
} from "./types";

import { type ReactNode, useId } from "react";

import { Button, Checkbox, Label } from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink } from "../app-navigation";
import { formatCount } from "../dashboard/components/stat-charts";
import { HighlightedText } from "../shared";

const PATH_LABELS: Record<string, string> = {
  IS_A: "a kind of",
  PART_OF: "part of",
  DERIVED_FROM: "made from",
  PROCESSED_FROM: "processed from",
};

const STATUS_OPTIONS: {
  value: NonNullable<ConceptOccurrenceFilters["status"]>;
  label: string;
}[] = [
  { value: "AUTO_RESOLVED", label: "Resolved automatically" },
  { value: "VERIFIED", label: "Verified" },
  { value: "NEEDS_REVIEW", label: "Waiting for review" },
];

const STATUS_LABELS: Record<string, string> = {
  VERIFIED: "verified",
  NEEDS_REVIEW: "waiting for review",
};

export interface ConceptOccurrencesPageProps {
  concept: { id: string; canonicalName: string };
  page: ConceptOccurrencePage;
  options: ConceptOccurrenceFilterOptions;
  filters: ConceptOccurrenceFilters;
  onFiltersChange: (filters: ConceptOccurrenceFilters) => void;
  /** Fetches the next page; omit to hide "Load more". */
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** True while a filter change is loading; the previous results stay on screen. */
  isUpdating?: boolean;
  /** The concept page, with the same switches. */
  backHref: string;
}

/** "part of chicken", or for deeper paths "a kind of → part of chicken". */
function describePath(path: string[], conceptName: string): string {
  const steps = [...path].reverse().map((type) => PATH_LABELS[type] ?? type);
  return `${steps.join(" → ")} ${conceptName}`;
}

function groupByNote(items: ConceptOccurrence[]): ConceptOccurrence[][] {
  const groups: ConceptOccurrence[][] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last[0]?.noteId === item.noteId) last.push(item);
    else groups.push([item]);
  }
  return groups;
}

function FilterSelect({
  label,
  value,
  emptyLabel,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string | undefined;
  emptyLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}): ReactNode {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="h-9 min-w-40 rounded-md border border-greyscale-300 bg-white px-2 text-sm disabled:opacity-50"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Every line behind a concept's usage (Phase 8-B), grouped by note in reading order, each linking back to its note and recipe, with how it matched (directly, or through a more specific food), its preparations and attributes, and filters for expansion, review status, preparation, attribute, source, and category.
 *
 * @example
 * <ConceptOccurrencesPageContent concept={concept} page={page} options={options} filters={filters} onFiltersChange={setFilters} onLoadMore={loadMore} backHref="/concepts/0193..." />
 */
export function ConceptOccurrencesPageContent({
  concept,
  page,
  options,
  filters,
  onFiltersChange,
  onLoadMore,
  isLoadingMore = false,
  isUpdating = false,
  backHref,
}: ConceptOccurrencesPageProps): ReactNode {
  const id = useId();
  const set = (patch: Partial<ConceptOccurrenceFilters>) =>
    onFiltersChange({ ...filters, ...patch });
  const hasNarrowing = Boolean(
    filters.preparationKey ||
    filters.attribute ||
    filters.sourceId ||
    filters.categoryId ||
    filters.status
  );
  const groups = groupByNote(page.items);

  return (
    <article className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {concept.canonicalName}
      </AppLink>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">
          Lines with {concept.canonicalName}
        </h1>
        <p className="text-sm text-greyscale-700" aria-live="polite">
          {isUpdating
            ? "Updating…"
            : `${formatCount(page.total)} ${page.total === 1 ? "mention" : "mentions"}${filters.includeMadeFrom ? ", including kinds, parts, and foods made from it" : ", including kinds and parts"}`}
        </p>
      </header>

      <fieldset className="flex flex-col gap-3 rounded-md border border-greyscale-200 p-4">
        <legend className="sr-only">Filter lines</legend>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${id}-made-from`}
              checked={filters.includeMadeFrom}
              onCheckedChange={(checked) =>
                set({ includeMadeFrom: checked === true })
              }
            />
            <Label htmlFor={`${id}-made-from`} className="text-sm font-normal">
              Include foods made from it
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${id}-review`}
              checked={filters.includeNeedsReview}
              onCheckedChange={(checked) =>
                set({
                  includeNeedsReview: checked === true,
                  ...(checked !== true && filters.status === "NEEDS_REVIEW"
                    ? { status: undefined }
                    : {}),
                })
              }
            />
            <Label htmlFor={`${id}-review`} className="text-sm font-normal">
              Include mentions waiting for review
            </Label>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Preparation"
            value={filters.preparationKey}
            emptyLabel="Any preparation"
            options={options.preparations.map((option) => ({
              value: option.key,
              label: option.label,
            }))}
            onChange={(value) => set({ preparationKey: value })}
          />
          <FilterSelect
            label="Attribute"
            value={filters.attribute}
            emptyLabel="Any attribute"
            options={options.attributes.map((option) => ({
              value: option.key,
              label: option.label,
            }))}
            onChange={(value) => set({ attribute: value })}
          />
          <FilterSelect
            label="Source"
            value={filters.sourceId}
            emptyLabel="Any source"
            options={options.sources.map((option) => ({
              value: option.id,
              label: `${option.label} (${formatCount(option.notes)})`,
            }))}
            onChange={(value) => set({ sourceId: value })}
          />
          <FilterSelect
            label="Category"
            value={filters.categoryId}
            emptyLabel="Any category"
            options={options.categories.map((option) => ({
              value: option.id,
              label: `${option.name} (${formatCount(option.notes)})`,
            }))}
            onChange={(value) => set({ categoryId: value })}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            emptyLabel="Any status"
            options={STATUS_OPTIONS.filter(
              (option) =>
                option.value !== "NEEDS_REVIEW" || filters.includeNeedsReview
            )}
            onChange={(value) =>
              set({ status: value as ConceptOccurrenceFilters["status"] })
            }
          />
          {hasNarrowing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onFiltersChange({
                  includeMadeFrom: filters.includeMadeFrom,
                  includeNeedsReview: filters.includeNeedsReview,
                })
              }
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </fieldset>

      {groups.length === 0 ? (
        <p className="text-sm text-greyscale-600">
          No lines match these filters.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {groups.map((group) => {
            const first = group[0] as ConceptOccurrence;
            return (
              <li
                key={`${first.noteId}:${first.mentionId}`}
                className="rounded-md border border-greyscale-200 p-4"
              >
                <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base font-semibold">
                  <AppLink
                    href={`/notes/${first.noteId}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {first.noteTitle ?? "Untitled note"}
                  </AppLink>
                  {first.recipeId ? (
                    <AppLink
                      href={`/recipes/${first.recipeId}`}
                      aria-label={`Recipe: ${first.recipeTitle ?? first.noteTitle ?? "untitled"}`}
                      className="text-sm font-normal text-primary underline underline-offset-2"
                    >
                      Recipe
                    </AppLink>
                  ) : null}
                </h2>
                <ul className="mt-2 flex flex-col gap-2 text-sm">
                  {group.map((item) => (
                    <li key={item.mentionId} className="flex flex-col gap-0.5">
                      <HighlightedText text={item.lineText} span={item.span} />
                      <span className="text-xs text-greyscale-600">
                        {item.path.length > 0 ? (
                          <>
                            <AppLink
                              href={`/concepts/${item.concept.id}`}
                              className="underline underline-offset-2"
                            >
                              {item.concept.canonicalName}
                            </AppLink>{" "}
                            ({describePath(item.path, concept.canonicalName)})
                          </>
                        ) : (
                          concept.canonicalName
                        )}
                        {STATUS_LABELS[item.status]
                          ? ` · ${STATUS_LABELS[item.status]}`
                          : ""}
                        {item.preparations.length > 0
                          ? ` · ${item.preparations.join(", ")}`
                          : ""}
                        {item.attributes.length > 0
                          ? ` · ${item.attributes.join(", ")}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}

      {page.nextCursor && onLoadMore ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
          <span className="text-sm text-greyscale-600">
            Showing {formatCount(page.items.length)} of{" "}
            {formatCount(page.total)}
          </span>
        </div>
      ) : null}
    </article>
  );
}

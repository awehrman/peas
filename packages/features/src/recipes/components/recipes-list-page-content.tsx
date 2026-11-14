"use client";

import { type ReactNode, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Label,
  Placeholder,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@peas/components";
import { CookingPot, X } from "lucide-react";

import { AppLink, buildHref, useAppNavigation } from "../../app-navigation";
import { InlineError, type MutationAction, PageLinks, SearchForm, useMutation } from "../../shared";
import type { ConceptRef } from "../../teach/types";
import type {
  CategoryProvenance,
  RecipeListItem,
  RecipeTaxonomyOptions,
  RecipesFilters,
  RecipesPageData,
} from "../types";

const RECIPES_PATH = "/recipes";
const ANY_VALUE = "__any__";

interface RecipesListPageContentProps {
  data: RecipesPageData & { concept?: ConceptRef | null };
  filters: RecipesFilters;
  options: RecipeTaxonomyOptions;
  onPromoteCompletedNotes?: MutationAction<[], { created: number }>;
}

export function RecipesListPageContent({
  data,
  filters,
  options,
  onPromoteCompletedNotes,
}: RecipesListPageContentProps): ReactNode {
  const { push } = useAppNavigation();
  const currentParams = {
    q: filters.query,
    category: filters.category,
    provenance:
      filters.categoryProvenance && filters.categoryProvenance !== "ANY"
        ? filters.categoryProvenance.toLowerCase()
        : undefined,
    tag: filters.tag,
    concept: filters.conceptId,
  };
  const navigate = (overrides: Record<string, string | undefined>) =>
    push(buildHref(RECIPES_PATH, currentParams, { ...overrides, page: undefined }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <SearchForm
            key={filters.query ?? ""}
            id="recipes-search"
            label="Search recipes"
            defaultValue={filters.query}
            placeholder="e.g. chili"
            onSearch={(query) => navigate({ q: query })}
          />
          <TaxonomySelect
            id="recipes-category"
            label="Category"
            value={filters.category}
            options={options.categories}
            onChange={(category) => navigate({ category })}
          />
          {filters.category ? (
            <ProvenanceSelect
              value={filters.categoryProvenance ?? "ANY"}
              onChange={(provenance) =>
                navigate({ provenance: provenance === "ANY" ? undefined : provenance.toLowerCase() })
              }
            />
          ) : null}
          <TaxonomySelect
            id="recipes-tag"
            label="Tag"
            value={filters.tag}
            options={options.tags}
            onChange={(tag) => navigate({ tag })}
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <AppLink href="/recipes/categories" className="text-sm text-primary hover:underline">
            Manage categories
          </AppLink>
          {onPromoteCompletedNotes ? <PromoteNotesButton onPromote={onPromoteCompletedNotes} /> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-greyscale-600" aria-live="polite">
          {data.total} {data.total === 1 ? "recipe" : "recipes"}
          {data.concept ? ` with ${data.concept.canonicalName}` : null}
        </p>
        {data.concept ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-greyscale-100 py-0.5 pr-1 pl-2 text-sm text-greyscale-800">
            <AppLink
              href={`/concepts/${data.concept.id}`}
              className="hover:underline"
            >
              {data.concept.canonicalName}
            </AppLink>
            <button
              type="button"
              aria-label={`Stop filtering by ${data.concept.canonicalName}`}
              className="rounded-full p-0.5 text-greyscale-600 hover:text-greyscale-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigate({ concept: undefined })}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>

      {data.items.length === 0 ? (
        <Placeholder
          label="No recipes yet. Save a note as a recipe from its detail page."
          icon={<CookingPot />}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}

      <PageLinks
        label="Recipes pagination"
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        getHref={(page) => buildHref(RECIPES_PATH, currentParams, { page })}
      />
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: RecipeListItem }): ReactNode {
  return (
    <Card className="h-full gap-3 overflow-hidden py-0">
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-greyscale-100" aria-hidden="true">
          <CookingPot className="h-10 w-10 text-greyscale-400" />
        </div>
      )}
      <CardContent className="flex flex-col gap-2 pb-4">
        <h2 className="font-semibold leading-tight">
          <AppLink href={`${RECIPES_PATH}/${recipe.id}`} className="hover:underline">
            {recipe.title}
          </AppLink>
        </h2>
        <p className="text-xs text-greyscale-600">
          {recipe.ingredientLineCount} ingredient {recipe.ingredientLineCount === 1 ? "line" : "lines"}
        </p>
        {recipe.categories.length > 0 || recipe.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-1" aria-label="Categories and tags">
            {recipe.categories.map((category) => (
              <li key={`category-${category}`}>
                <Badge>{category}</Badge>
              </li>
            ))}
            {recipe.tags.map((tag) => (
              <li key={`tag-${tag}`}>
                <Badge variant="secondary">{tag}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TaxonomySelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string | undefined) => void;
}): ReactNode {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? ANY_VALUE}
        onValueChange={(next) => onChange(next === ANY_VALUE ? undefined : next)}
      >
        <SelectTrigger id={id} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_VALUE}>Any {label.toLowerCase()}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const PROVENANCE_LABELS: Record<CategoryProvenance, string> = {
  ANY: "Approved or suggested",
  APPROVED: "Approved only",
  INFERRED: "Suggested only",
};

function ProvenanceSelect({
  value,
  onChange,
}: {
  value: CategoryProvenance;
  onChange: (value: CategoryProvenance) => void;
}): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="recipes-category-provenance">Category membership</Label>
      <Select value={value} onValueChange={(next) => onChange(next as CategoryProvenance)}>
        <SelectTrigger id="recipes-category-provenance" className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PROVENANCE_LABELS) as CategoryProvenance[]).map((option) => (
            <SelectItem key={option} value={option}>
              {PROVENANCE_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PromoteNotesButton({
  onPromote,
}: {
  onPromote: MutationAction<[], { created: number }>;
}): ReactNode {
  const promote = useMutation(onPromote);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setMessage(null);
    const result = await promote.run();
    if (result.success) {
      const created = result.data?.created ?? 0;
      setMessage(
        created === 0
          ? "Every completed note is already a recipe."
          : `Created ${created} ${created === 1 ? "recipe" : "recipes"}.`
      );
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" onClick={handleClick} disabled={promote.isPending}>
        {promote.isPending ? "Creating recipes..." : "Create recipes from completed notes"}
      </Button>
      <InlineError message={promote.error} />
      {message ? (
        <p role="status" className="text-sm text-greyscale-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}

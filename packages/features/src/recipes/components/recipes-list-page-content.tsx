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
import { CookingPot } from "lucide-react";

import { AppLink, buildHref, useAppNavigation } from "../../app-navigation";
import { InlineError, type MutationAction, PageLinks, SearchForm, useMutation } from "../../shared";
import type {
  RecipeListItem,
  RecipeTaxonomyOptions,
  RecipesFilters,
  RecipesPageData,
} from "../types";

const RECIPES_PATH = "/recipes";
const ANY_VALUE = "__any__";

interface RecipesListPageContentProps {
  data: RecipesPageData;
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
  const currentParams = { q: filters.query, category: filters.category, tag: filters.tag };
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
          <TaxonomySelect
            id="recipes-tag"
            label="Tag"
            value={filters.tag}
            options={options.tags}
            onChange={(tag) => navigate({ tag })}
          />
        </div>
        {onPromoteCompletedNotes ? <PromoteNotesButton onPromote={onPromoteCompletedNotes} /> : null}
      </div>

      <p className="text-sm text-greyscale-600" aria-live="polite">
        {data.total} {data.total === 1 ? "recipe" : "recipes"}
      </p>

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

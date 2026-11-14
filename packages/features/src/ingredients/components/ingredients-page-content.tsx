"use client";

import {
  AddIngredientDialog,
  type CreateIngredient,
} from "./add-ingredient-dialog";
import {
  type CheckIngredientName,
  IngredientCard,
  type SaveIngredient,
} from "./ingredient-card";
import { IngredientGroupList } from "./ingredient-group-list";
import type { SearchIngredients } from "./ingredient-picker";

import type { ReactNode } from "react";

import { Placeholder, cn } from "@peas/components";
import { Carrot } from "lucide-react";

import { AppLink, buildHref, useAppNavigation } from "../../app-navigation";
import type {
  IngredientDetail,
  IngredientGroup,
  IngredientGrouping,
  IngredientView,
} from "../types";

const INGREDIENTS_PATH = "/ingredients";

const GROUPING_LABELS: Record<IngredientGrouping, string> = {
  name: "Name",
  property: "Property",
  count: "Reference count",
  relationship: "Relationship",
};

interface IngredientsPageContentProps {
  view: IngredientView;
  grouping: IngredientGrouping;
  groups: IngredientGroup[];
  counts: { all: number; unreviewed: number };
  selected: IngredientDetail | null;
  categoryOptions: string[];
  onSave: SaveIngredient;
  onCreate: CreateIngredient;
  /** Checks a new alternate name against every food\'s names. */
  onCheckName?: CheckIngredientName;
  onSearch: SearchIngredients;
}

export function IngredientsPageContent({
  view,
  grouping,
  groups,
  counts,
  selected,
  categoryOptions,
  onSave,
  onCreate,
  onCheckName,
  onSearch,
}: IngredientsPageContentProps): ReactNode {
  const { push } = useAppNavigation();
  const params = {
    view: view === "all" ? undefined : view,
    group: grouping === "name" ? undefined : grouping,
  };
  const getIngredientHref = (id: string) =>
    buildHref(INGREDIENTS_PATH, params, { id });

  const selectedCard = selected ? (
    <section aria-label="Selected ingredient">
      <IngredientCard
        key={selected.id}
        ingredient={selected}
        categoryOptions={categoryOptions}
        isReviewQueue={view === "unreviewed"}
        onSave={onSave}
        onSearch={onSearch}
        onCheckName={onCheckName}
        onSaved={({ nextId, advanced }) => {
          if (!advanced) return;
          push(
            nextId
              ? getIngredientHref(nextId)
              : buildHref(INGREDIENTS_PATH, params)
          );
        }}
      />
    </section>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <FilterLinks
          label="Ingredient view"
          options={[
            {
              label: `Approved (${counts.all})`,
              isActive: view === "all",
              href: buildHref(INGREDIENTS_PATH, { ...params, view: undefined }),
            },
            {
              label: `Needs review (${counts.unreviewed})`,
              isActive: view === "unreviewed",
              href: buildHref(INGREDIENTS_PATH, {
                ...params,
                view: "unreviewed",
              }),
            },
          ]}
        />
        <div className="ml-auto flex flex-col items-end gap-3">
          <FilterLinks
            label="Group by"
            showLabel
            options={(Object.keys(GROUPING_LABELS) as IngredientGrouping[]).map(
              (option) => ({
                label: GROUPING_LABELS[option],
                isActive: grouping === option,
                href: buildHref(INGREDIENTS_PATH, {
                  ...params,
                  group: option === "name" ? undefined : option,
                }),
              })
            )}
          />
          <AddIngredientDialog
            onCreate={onCreate}
            onCreated={(id) => push(getIngredientHref(id))}
          />
        </div>
      </div>

      <section aria-label="Ingredients">
        {groups.length === 0 ? (
          <div className="flex flex-col gap-6">
            <Placeholder
              label={
                view === "unreviewed"
                  ? "Every ingredient has been reviewed."
                  : "No approved ingredients yet. Add one, or approve proposed foods under Needs review."
              }
              icon={<Carrot />}
            />
            {selectedCard}
          </div>
        ) : (
          <IngredientGroupList
            groups={groups}
            selectedId={listAnchorId(groups, selected)}
            selectedCard={selectedCard}
            getIngredientHref={getIngredientHref}
          />
        )}
      </section>
    </div>
  );
}

interface FilterLinksProps {
  label: string;
  showLabel?: boolean;
  options: { label: string; href: string; isActive: boolean }[];
}

function FilterLinks({
  label,
  showLabel = false,
  options,
}: FilterLinksProps): ReactNode {
  return (
    <nav aria-label={label} className="flex items-center gap-2">
      {showLabel ? (
        <span className="text-sm text-greyscale-600">{label}:</span>
      ) : null}
      <ul className="flex flex-wrap gap-4">
        {options.map((option) => (
          <li key={option.label}>
            <AppLink
              href={option.href}
              aria-current={option.isActive ? "page" : undefined}
              className={cn(
                "py-1 text-sm underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                option.isActive
                  ? "font-medium text-primary underline decoration-2"
                  : "text-greyscale-600 hover:text-foreground hover:underline"
              )}
            >
              {option.label}
            </AppLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Where the selected card sits in the list: beside the food itself, or, for a food outside the current view (an approved variant opened from the needs-review list), beside its base food.
 *
 * @example
 * listAnchorId(groups, cannedTomatoes) // canned tomatoes' id, or tomato's when canned tomatoes isn't listed
 */
function listAnchorId(
  groups: IngredientGroup[],
  selected: IngredientDetail | null
): string | undefined {
  if (!selected) return undefined;
  const listed = new Set(
    groups.flatMap((group) => group.ingredients.map((item) => item.id))
  );
  if (listed.has(selected.id)) return selected.id;
  return selected.relationships.find((relation) =>
    listed.has(relation.ingredient.id)
  )?.ingredient.id;
}

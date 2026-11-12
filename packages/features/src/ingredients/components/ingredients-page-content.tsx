"use client";

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

import { AddIngredientDialog, type CreateIngredient } from "./add-ingredient-dialog";
import { IngredientCard, type SaveIngredient } from "./ingredient-card";
import { IngredientGroupList } from "./ingredient-group-list";
import type { SearchIngredients } from "./ingredient-picker";

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
  onSearch,
}: IngredientsPageContentProps): ReactNode {
  const { push } = useAppNavigation();
  const params = { view: view === "all" ? undefined : view, group: grouping === "name" ? undefined : grouping };
  const getIngredientHref = (id: string) => buildHref(INGREDIENTS_PATH, params, { id });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <FilterLinks
            label="Ingredient view"
            options={[
              { label: `View all (${counts.all})`, isActive: view === "all", href: buildHref(INGREDIENTS_PATH, { ...params, view: undefined }) },
              {
                label: `Needs review (${counts.unreviewed})`,
                isActive: view === "unreviewed",
                href: buildHref(INGREDIENTS_PATH, { ...params, view: "unreviewed" }),
              },
            ]}
          />
          <FilterLinks
            label="Group by"
            showLabel
            options={(Object.keys(GROUPING_LABELS) as IngredientGrouping[]).map((option) => ({
              label: GROUPING_LABELS[option],
              isActive: grouping === option,
              href: buildHref(INGREDIENTS_PATH, {
                ...params,
                group: option === "name" ? undefined : option,
              }),
            }))}
          />
        </div>
        <AddIngredientDialog
          onCreate={onCreate}
          onCreated={(id) => push(getIngredientHref(id))}
        />
      </div>

      <div className={cn("grid gap-6", selected && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]")}>
        <section aria-label="Ingredients">
          {groups.length === 0 ? (
            <Placeholder
              label={view === "unreviewed" ? "Every ingredient has been reviewed." : "No ingredients yet. Import some notes to get started."}
              icon={<Carrot />}
            />
          ) : (
            <IngredientGroupList
              groups={groups}
              selectedId={selected?.id}
              getIngredientHref={getIngredientHref}
            />
          )}
        </section>

        {selected ? (
          <section aria-label="Selected ingredient" className="lg:sticky lg:top-0 lg:self-start">
            <IngredientCard
              key={`${selected.id}-${selected.reviewedAt ?? ""}`}
              ingredient={selected}
              categoryOptions={categoryOptions}
              isReviewQueue={view === "unreviewed"}
              onSave={onSave}
              onSearch={onSearch}
              onSaved={({ nextId, advanced }) => {
                if (!advanced) return;
                push(nextId ? getIngredientHref(nextId) : buildHref(INGREDIENTS_PATH, params));
              }}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}

interface FilterLinksProps {
  label: string;
  showLabel?: boolean;
  options: { label: string; href: string; isActive: boolean }[];
}

function FilterLinks({ label, showLabel = false, options }: FilterLinksProps): ReactNode {
  return (
    <nav aria-label={label} className="flex items-center gap-2">
      {showLabel ? <span className="text-sm text-greyscale-600">{label}:</span> : null}
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => (
          <li key={option.label}>
            <AppLink
              href={option.href}
              aria-current={option.isActive ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                option.isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
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

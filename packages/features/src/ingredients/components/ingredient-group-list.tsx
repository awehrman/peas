"use client";

import { type CSSProperties, type ReactNode, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
} from "@peas/components";
import { ChevronRight } from "lucide-react";
import { FixedSizeList } from "react-window";

import { AppLink } from "../../app-navigation";
import type { IngredientGroup, IngredientSummary } from "../types";
import { AUTO_EXPAND_GROUP_LIMIT } from "../utils/group-ingredients";

const ROW_HEIGHT = 32;
const MAX_VISIBLE_ROWS = 12;

interface IngredientGroupListProps {
  groups: IngredientGroup[];
  selectedId?: string;
  getIngredientHref: (id: string) => string;
}

export function IngredientGroupList({
  groups,
  selectedId,
  getIngredientHref,
}: IngredientGroupListProps): ReactNode {
  const startExpanded = groups.length < AUTO_EXPAND_GROUP_LIMIT;

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <IngredientGroupSection
          key={group.key}
          group={group}
          selectedId={selectedId}
          getIngredientHref={getIngredientHref}
          defaultOpen={
            startExpanded ||
            group.ingredients.some((ingredient) => ingredient.id === selectedId)
          }
        />
      ))}
    </div>
  );
}

function IngredientGroupSection({
  group,
  selectedId,
  getIngredientHref,
  defaultOpen,
}: {
  group: IngredientGroup;
  selectedId?: string;
  getIngredientHref: (id: string) => string;
  defaultOpen: boolean;
}): ReactNode {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const visibleRows = Math.min(group.ingredients.length, MAX_VISIBLE_ROWS);
  const selectedIndex = group.ingredients.findIndex(
    (ingredient) => ingredient.id === selectedId
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-accent">
        <span className="flex items-center gap-2 font-medium">
          <ChevronRight
            aria-hidden="true"
            className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")}
          />
          {group.label}
        </span>
        <span className="text-sm text-greyscale-600">{group.ingredients.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div role="list" aria-label={`${group.label} ingredients`} className="border-t px-2 py-1">
          <FixedSizeList<IngredientSummary[]>
            height={visibleRows * ROW_HEIGHT}
            width="100%"
            itemCount={group.ingredients.length}
            itemSize={ROW_HEIGHT}
            itemData={group.ingredients}
            initialScrollOffset={
              selectedIndex > MAX_VISIBLE_ROWS / 2
                ? (selectedIndex - MAX_VISIBLE_ROWS / 2) * ROW_HEIGHT
                : 0
            }
          >
            {({ index, style, data }) => {
              const ingredient = data[index];
              if (!ingredient) return null;
              return (
                <IngredientRow
                  ingredient={ingredient}
                  style={style}
                  isSelected={ingredient.id === selectedId}
                  href={getIngredientHref(ingredient.id)}
                />
              );
            }}
          </FixedSizeList>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function IngredientRow({
  ingredient,
  style,
  isSelected,
  href,
}: {
  ingredient: IngredientSummary;
  style: CSSProperties;
  isSelected: boolean;
  href: string;
}): ReactNode {
  return (
    <div role="listitem" style={style}>
      <AppLink
        href={href}
        aria-current={isSelected ? "page" : undefined}
        className={cn(
          "flex h-full items-center justify-between gap-2 rounded px-2 text-sm hover:bg-accent",
          isSelected && "bg-primary-100 font-semibold",
          ingredient.parentIngredientId && "italic",
          !ingredient.isReviewed && "text-greyscale-600"
        )}
      >
        <span className="truncate">
          {ingredient.name}
          {!ingredient.isReviewed ? <span className="sr-only"> (needs review)</span> : null}
        </span>
        <span className="flex items-center gap-2">
          {!ingredient.isReviewed ? (
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />
          ) : null}
          <span className="text-xs text-greyscale-500">{ingredient.referenceCount}</span>
        </span>
      </AppLink>
    </div>
  );
}

"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

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

const ROW_HEIGHT = 28;
const SIDE_LIST_VISIBLE_ROWS = 18;
const LARGE_GROUP_VISIBLE_ROWS = 12;
/** Above this many ingredients a group renders as a virtualized single column. */
const COLUMN_LIST_LIMIT = 500;

interface IngredientGroupListProps {
  groups: IngredientGroup[];
  selectedId?: string;
  /** Shown beside the list, inside the first group that holds the selected ingredient. */
  selectedCard?: ReactNode;
  getIngredientHref: (id: string) => string;
}

export function IngredientGroupList({
  groups,
  selectedId,
  selectedCard,
  getIngredientHref,
}: IngredientGroupListProps): ReactNode {
  const startExpanded = groups.length < AUTO_EXPAND_GROUP_LIMIT;
  const selectedGroupKey = selectedId
    ? groups.find((group) => group.ingredients.some((ingredient) => ingredient.id === selectedId))
        ?.key
    : undefined;

  return (
    <div className="flex flex-col">
      {selectedCard && !selectedGroupKey ? (
        <div className="border-b border-greyscale-200">{selectedCard}</div>
      ) : null}
      {groups.map((group) => {
        const holdsCard = group.key === selectedGroupKey;
        return (
          <IngredientGroupSection
            key={group.key}
            group={group}
            selectedId={selectedId}
            selectedCard={holdsCard ? selectedCard : undefined}
            getIngredientHref={getIngredientHref}
            defaultOpen={startExpanded || holdsCard}
          />
        );
      })}
    </div>
  );
}

function IngredientGroupSection({
  group,
  selectedId,
  selectedCard,
  getIngredientHref,
  defaultOpen,
}: {
  group: IngredientGroup;
  selectedId?: string;
  selectedCard?: ReactNode;
  getIngredientHref: (id: string) => string;
  defaultOpen: boolean;
}): ReactNode {
  const hasCard = selectedCard != null;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [openedForId, setOpenedForId] = useState(hasCard ? selectedId : undefined);

  // Reopen when a newly selected ingredient lands in this group
  if (hasCard && selectedId !== openedForId) {
    setOpenedForId(selectedId);
    setIsOpen(true);
  }

  const listLabel = `${group.label} ingredients`;
  const isLargeGroup = group.ingredients.length > COLUMN_LIST_LIMIT;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-greyscale-200 py-3 text-left text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <span className="flex items-center gap-2">
          <ChevronRight
            aria-hidden="true"
            className={cn("h-4 w-4 text-greyscale-500 transition-transform", isOpen && "rotate-90")}
          />
          {group.label}
        </span>
        <span className="tabular-nums text-greyscale-600">{group.ingredients.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {hasCard ? (
          <div className="grid border-b border-greyscale-200 lg:grid-cols-[13rem_minmax(0,1fr)]">
            <div className="order-2 py-2 lg:order-1">
              <VirtualIngredientList
                label={listLabel}
                ingredients={group.ingredients}
                selectedId={selectedId}
                visibleRows={SIDE_LIST_VISIBLE_ROWS}
                getIngredientHref={getIngredientHref}
              />
            </div>
            <div className="order-1 min-w-0 border-greyscale-200 max-lg:border-b lg:order-2 lg:border-l">
              {selectedCard}
            </div>
          </div>
        ) : isLargeGroup ? (
          <div className="border-b border-greyscale-200 py-2">
            <VirtualIngredientList
              label={listLabel}
              ingredients={group.ingredients}
              selectedId={selectedId}
              visibleRows={LARGE_GROUP_VISIBLE_ROWS}
              getIngredientHref={getIngredientHref}
            />
          </div>
        ) : (
          <ul
            aria-label={listLabel}
            className="max-h-60 columns-1 gap-x-4 overflow-y-auto border-b border-greyscale-200 py-2 sm:columns-2 md:columns-3 lg:max-h-[500px] lg:columns-4 xl:columns-5"
          >
            {group.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="break-inside-avoid">
                <IngredientLink
                  ingredient={ingredient}
                  isSelected={ingredient.id === selectedId}
                  href={getIngredientHref(ingredient.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function VirtualIngredientList({
  label,
  ingredients,
  selectedId,
  visibleRows,
  getIngredientHref,
}: {
  label: string;
  ingredients: IngredientSummary[];
  selectedId?: string;
  visibleRows: number;
  getIngredientHref: (id: string) => string;
}): ReactNode {
  const listRef = useRef<FixedSizeList<IngredientSummary[]>>(null);
  const selectedIndex = ingredients.findIndex((ingredient) => ingredient.id === selectedId);

  useEffect(() => {
    if (selectedIndex >= 0) listRef.current?.scrollToItem(selectedIndex, "smart");
  }, [selectedIndex]);

  return (
    <div role="list" aria-label={label}>
      <FixedSizeList<IngredientSummary[]>
        ref={listRef}
        height={Math.min(ingredients.length, visibleRows) * ROW_HEIGHT}
        width="100%"
        itemCount={ingredients.length}
        itemSize={ROW_HEIGHT}
        itemData={ingredients}
      >
        {({ index, style, data }) => {
          const ingredient = data[index];
          if (!ingredient) return null;
          return (
            <div role="listitem" style={style}>
              <IngredientLink
                ingredient={ingredient}
                isSelected={ingredient.id === selectedId}
                href={getIngredientHref(ingredient.id)}
              />
            </div>
          );
        }}
      </FixedSizeList>
    </div>
  );
}

function IngredientLink({
  ingredient,
  isSelected,
  href,
}: {
  ingredient: IngredientSummary;
  isSelected: boolean;
  href: string;
}): ReactNode {
  return (
    <AppLink
      href={href}
      aria-current={isSelected ? "page" : undefined}
      className={cn(
        "flex h-7 items-center justify-between gap-2 rounded-sm px-2 text-sm hover:text-secondary-600",
        isSelected && "bg-secondary-100 font-semibold",
        ingredient.parentIngredientId && "italic",
        !ingredient.isReviewed && "text-greyscale-600"
      )}
    >
      <span className="truncate">
        {ingredient.name}
        {!ingredient.isReviewed ? <span className="sr-only"> (needs review)</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {!ingredient.isReviewed ? (
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />
        ) : null}
        <span className="text-xs text-greyscale-500">{ingredient.referenceCount}</span>
      </span>
    </AppLink>
  );
}

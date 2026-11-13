import {
  INGREDIENT_PROPERTIES,
  type IngredientGroup,
  type IngredientGrouping,
  type IngredientProperty,
  type IngredientSummary,
  type IngredientView,
} from "../types";

/** Below this many ingredients, grouping by name shows one flat group. */
export const NAME_BUCKET_THRESHOLD = 300;

/** Groups start expanded when there are fewer than this many. */
export const AUTO_EXPAND_GROUP_LIMIT = 10;

interface SortableGroup extends IngredientGroup {
  sortKey: number;
}

const PROPERTY_LABELS: Partial<Record<IngredientProperty, string>> = {
  FAT: "Oil & Fat",
};

export function formatPropertyLabel(property: IngredientProperty): string {
  const label = PROPERTY_LABELS[property];
  if (label) return label;
  return property
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function addToGroup(
  groups: Map<string, SortableGroup>,
  key: string,
  label: string,
  sortKey: number,
  ingredient: IngredientSummary
) {
  const group = groups.get(key);
  if (group) {
    group.ingredients.push(ingredient);
  } else {
    groups.set(key, { key, label, sortKey, ingredients: [ingredient] });
  }
}

function getNameBucket(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

/**
 * 0, 1 and 2 references get their own groups; after that the buckets are
 * 3-10, 11-20, then every ten (21-30, 31-40, ...).
 */
export function getReferenceCountBucket(count: number): {
  key: string;
  label: string;
  lowerBound: number;
} {
  if (count <= 2) {
    return {
      key: `count-${count}`,
      label: `${count} Reference${count === 1 ? "" : "s"}`,
      lowerBound: count,
    };
  }

  const [lower, upper] =
    count <= 10
      ? [3, 10]
      : count <= 20
        ? [11, 20]
        : [
            Math.floor((count - 1) / 10) * 10 + 1,
            Math.floor((count - 1) / 10) * 10 + 10,
          ];

  return {
    key: `count-${lower}-${upper}`,
    label: `${lower} - ${upper} References`,
    lowerBound: lower,
  };
}

/**
 * Buckets ingredients for the /ingredients page. Property grouping can place
 * one ingredient in several groups.
 */
export function groupIngredients(
  ingredients: IngredientSummary[],
  grouping: IngredientGrouping,
  view: IngredientView = "all"
): IngredientGroup[] {
  const groups = new Map<string, SortableGroup>();

  for (const ingredient of ingredients) {
    switch (grouping) {
      case "property": {
        if (ingredient.properties.length === 0) {
          addToGroup(
            groups,
            "none",
            "No Properties",
            INGREDIENT_PROPERTIES.length,
            ingredient
          );
          break;
        }
        for (const property of new Set(ingredient.properties)) {
          addToGroup(
            groups,
            property,
            formatPropertyLabel(property),
            INGREDIENT_PROPERTIES.indexOf(property),
            ingredient
          );
        }
        break;
      }
      case "count": {
        const bucket = getReferenceCountBucket(ingredient.referenceCount);
        addToGroup(
          groups,
          bucket.key,
          bucket.label,
          bucket.lowerBound,
          ingredient
        );
        break;
      }
      case "relationship": {
        if (ingredient.parentIngredientId) {
          addToGroup(groups, "variants", "Variants", 1, ingredient);
        } else {
          addToGroup(
            groups,
            "top-level",
            "Top Level Ingredients",
            0,
            ingredient
          );
        }
        break;
      }
      default: {
        if (ingredients.length < NAME_BUCKET_THRESHOLD) {
          const label =
            view === "unreviewed" ? "Ingredients To Review" : "All Ingredients";
          addToGroup(groups, "all", label, 0, ingredient);
        } else {
          const bucket = getNameBucket(ingredient.name);
          const sortKey = bucket === "#" ? 26 : bucket.charCodeAt(0) - 65;
          addToGroup(groups, `name-${bucket}`, bucket, sortKey, ingredient);
        }
      }
    }
  }

  return [...groups.values()]
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ key, label, ingredients: members }) => ({
      key,
      label,
      ingredients: [...members].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

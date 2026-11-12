export const INGREDIENT_PROPERTY_GROUPS = [
  {
    label: "Dietary",
    properties: ["VEGAN", "VEGETARIAN", "GLUTEN_FREE"],
  },
  {
    label: "Core type",
    properties: [
      "MEAT",
      "FISH",
      "DAIRY",
      "EGG",
      "GRAIN",
      "LEGUME",
      "FRUIT",
      "VEGETABLE",
      "HERB",
      "SPICE",
    ],
  },
  {
    label: "Allergens",
    properties: ["NUTS", "SHELLFISH", "SOY", "SESAME", "CORN", "ALCOHOL"],
  },
] as const;

export type IngredientProperty =
  (typeof INGREDIENT_PROPERTY_GROUPS)[number]["properties"][number];

export const INGREDIENT_PROPERTIES: readonly IngredientProperty[] =
  INGREDIENT_PROPERTY_GROUPS.flatMap((group) => group.properties);

export const INGREDIENT_VIEWS = ["all", "unreviewed"] as const;
export type IngredientView = (typeof INGREDIENT_VIEWS)[number];

export const INGREDIENT_GROUPINGS = [
  "name",
  "property",
  "count",
  "relationship",
] as const;
export type IngredientGrouping = (typeof INGREDIENT_GROUPINGS)[number];

export interface IngredientSummary {
  id: string;
  name: string;
  plural: string | null;
  isReviewed: boolean;
  parentIngredientId: string | null;
  properties: IngredientProperty[];
  referenceCount: number;
}

export interface IngredientGroup {
  key: string;
  label: string;
  ingredients: IngredientSummary[];
}

export interface IngredientOption {
  id: string;
  name: string;
}

export interface IngredientDetail {
  id: string;
  name: string;
  plural: string | null;
  isReviewed: boolean;
  reviewedAt: string | null;
  isComposedIngredient: boolean;
  properties: IngredientProperty[];
  aliases: { id: string; name: string }[];
  substitutions: IngredientOption[];
  parent: IngredientOption | null;
  variants: IngredientOption[];
  category: string | null;
  tags: string[];
  referenceCount: number;
  references: {
    id: string;
    reference: string;
    noteId: string | null;
    noteTitle: string | null;
  }[];
}

export interface IngredientSaveInput {
  id: string;
  name: string;
  plural: string | null;
  properties: IngredientProperty[];
  isComposedIngredient: boolean;
  parentIngredientId: string | null;
  substitutionIds: string[];
  aliases: string[];
  category: string | null;
  tags: string[];
  markReviewed: boolean;
  advanceToNext: boolean;
}

export interface IngredientCreateInput {
  name: string;
  plural: string | null;
}

/** The card's checkbox groups: properties stored on the food (core types and allergens inherit across every relationship). */
export const INGREDIENT_PROPERTY_GROUPS = [
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
      "FAT",
      "SWEETENER",
      "SEASONING",
    ],
  },
  {
    label: "Allergens",
    properties: [
      "GLUTEN",
      "NUTS",
      "SHELLFISH",
      "SOY",
      "SESAME",
      "CORN",
      "ALCOHOL",
    ],
  },
] as const;

export type IngredientStoredProperty =
  (typeof INGREDIENT_PROPERTY_GROUPS)[number]["properties"][number];

/** Automatic tags computed from the food's properties, never stored: vegetarian has no meat or fish, vegan also no dairy or egg, gluten-free no gluten. */
export const INGREDIENT_DIETARY_TAGS = [
  "VEGAN",
  "VEGETARIAN",
  "GLUTEN_FREE",
] as const;

/** How an automatic tag reads among the food's tags. */
export const INGREDIENT_DIETARY_TAG_LABELS: Record<
  IngredientDietaryTag,
  string
> = {
  VEGAN: "vegan",
  VEGETARIAN: "vegetarian",
  GLUTEN_FREE: "gluten-free",
};
export type IngredientDietaryTag = (typeof INGREDIENT_DIETARY_TAGS)[number];

/** True for properties stored on the food (everything but the computed dietary tags). */
export function isIngredientStoredProperty(
  property: IngredientProperty
): property is IngredientStoredProperty {
  return !(INGREDIENT_DIETARY_TAGS as readonly string[]).includes(property);
}

/** Anything the list can group by. */
export type IngredientProperty =
  IngredientStoredProperty | IngredientDietaryTag;

export const INGREDIENT_PROPERTIES: readonly IngredientProperty[] = [
  ...INGREDIENT_DIETARY_TAGS,
  ...INGREDIENT_PROPERTY_GROUPS.flatMap((group) => group.properties),
];

/**
 * One stored property on the card: what this food says, what it would inherit, and from which food. A FALSE `explicit` is a "does not contain" overriding an inherited TRUE.
 *
 * @example
 * { property: "GLUTEN", explicit: null, inherited: "TRUE", inheritedFrom: { id, name: "wheat" } }
 */
export interface IngredientPropertyState {
  property: IngredientStoredProperty;
  explicit: "TRUE" | "FALSE" | "UNKNOWN" | null;
  inherited: "TRUE" | "FALSE" | "UNKNOWN" | null;
  inheritedFrom: IngredientOption | null;
}

/** Relationship types that make a food composed: it is made or processed from another food. */
export const COMPOSING_RELATIONSHIP_TYPES: readonly IngredientRelationshipType[] =
  ["DERIVED_FROM", "PROCESSED_FROM"];

export const INGREDIENT_RELATIONSHIP_TYPES = [
  "IS_A",
  "PART_OF",
  "DERIVED_FROM",
  "PROCESSED_FROM",
] as const;
export type IngredientRelationshipType =
  (typeof INGREDIENT_RELATIONSHIP_TYPES)[number];

export const INGREDIENT_RELATIONSHIP_LABELS: Record<
  IngredientRelationshipType,
  string
> = {
  IS_A: "is a kind of",
  PART_OF: "is part of",
  DERIVED_FROM: "is made from",
  PROCESSED_FROM: "is processed from",
};

/**
 * How a base food's card titles the foods that relate to it.
 *
 * @example
 * INGREDIENT_VARIANT_HEADINGS.PROCESSED_FROM("tomato") // "Processed from tomato"
 */
export const INGREDIENT_VARIANT_HEADINGS: Record<
  IngredientRelationshipType,
  (name: string) => string
> = {
  IS_A: (name) => `Kinds of ${name}`,
  PART_OF: (name) => `Parts of ${name}`,
  DERIVED_FROM: (name) => `Made from ${name}`,
  PROCESSED_FROM: (name) => `Processed from ${name}`,
};

/** "all" lists approved foods; "unreviewed" lists proposed ones waiting for review. */
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

/** A relationship as the card shows it: the other food and how they relate. */
export interface IngredientRelation {
  relationshipType: IngredientRelationshipType;
  ingredient: IngredientOption;
}

export interface IngredientDetail {
  id: string;
  name: string;
  plural: string | null;
  isReviewed: boolean;
  reviewedAt: string | null;
  isComposedIngredient: boolean;
  /** Stored properties set here or inherited. */
  propertyStates: IngredientPropertyState[];
  /** Automatic tags from the food's properties; empty when the food has no core type. */
  dietaryTags: IngredientProperty[];
  aliases: { id: string; name: string }[];
  substitutions: IngredientOption[];
  /** Foods this one comes from or belongs to ("canned tomatoes" is processed from "tomato"). */
  relationships: IngredientRelation[];
  /** Foods that relate to this one ("canned tomatoes" on tomato's card). */
  variants: IngredientRelation[];
  /** Category names, alphabetical. */
  categories: string[];
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
  /** Stored properties set to "contains". */
  properties: IngredientStoredProperty[];
  /** Stored properties set to "does not contain". */
  excludedProperties: IngredientStoredProperty[];
  isComposedIngredient: boolean;
  /** The complete set of foods this one relates to. */
  relationships: {
    ingredientId: string;
    relationshipType: IngredientRelationshipType;
  }[];
  substitutionIds: string[];
  aliases: string[];
  /** The complete set of category names. */
  categories: string[];
  tags: string[];
  markReviewed: boolean;
  advanceToNext: boolean;
}

export interface IngredientCreateInput {
  name: string;
  plural: string | null;
}

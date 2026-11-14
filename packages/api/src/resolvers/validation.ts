import { z } from "zod";

export const MAX_SEARCH_QUERY_LENGTH = 100;

export const lineReviewInputSchema = z.object({
  lineId: z.string().min(1),
  status: z.enum(["UNREVIEWED", "CORRECT", "INCORRECT"]),
});

export const idSchema = z.string().min(1);

export const recipeUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(300),
  categories: z.array(z.string().trim().min(1).max(100)).max(50),
  tags: z.array(z.string().trim().min(1).max(100)).max(50),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

/**
 * @example
 * { conceptId: "0193...", kind: "CATEGORY", key: "CATEGORY:Spices", value: "TRUE", note: null }
 */
export const conceptClassificationSchema = z
  .object({
    conceptId: z.uuid(),
    kind: z.enum(["FOOD_GROUP", "DIETARY", "ALLERGEN", "CATEGORY", "CERTIFICATION"]),
    key: z.string().trim().min(1, "Key is required").max(100),
    value: z.enum(["TRUE", "FALSE", "UNKNOWN"]),
    note: optionalText(500),
  })
  .refine(
    ({ kind, key }) =>
      kind !== "CATEGORY" || (key.startsWith("CATEGORY:") && key.length > 9),
    { message: "Category keys look like CATEGORY:<name>", path: ["key"] }
  );

export const conceptTagsSchema = z.object({
  conceptId: z.uuid(),
  tags: z.array(z.string().trim().min(1).max(100)).max(50),
});

/**
 * @example
 * { conceptId: "<buttermilk>", substituteId: "<plain yogurt>", ratio: "3/4 cup per cup", note: null }
 */
export const conceptSubstitutionSchema = z
  .object({
    conceptId: z.uuid(),
    substituteId: z.uuid(),
    ratio: optionalText(100),
    note: optionalText(500),
  })
  .refine(({ conceptId, substituteId }) => conceptId !== substituteId, {
    message: "A concept can't substitute for itself",
    path: ["substituteId"],
  });

/**
 * @example
 * { keep: "EXISTING", mergeSources: true }
 */
export const duplicateResolutionSchema = z.object({
  keep: z.enum(["EXISTING", "INCOMING", "BOTH"]),
  mergeSources: z.boolean(),
});

const isbnSchema = (length: 10 | 13) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/[-\s]/g, "").toUpperCase())
    .refine((value) => value === "" || new RegExp(`^\\d{${length - 1}}[\\dX]$`).test(value), {
      message: `ISBN-${length} must have ${length} digits`,
    })
    .nullish()
    .transform((value) => (value ? value : null));

/**
 * @example
 * { title: "Grandma's Binder", subtitle: null, authors: ["Ruth"], publisher: null, publishedYear: 1974, isbn13: null, isbn10: null }
 */
export const manualBookSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  subtitle: optionalText(300),
  authors: z.array(z.string().trim().min(1).max(200)).max(20),
  publisher: optionalText(200),
  publishedYear: z.number().int().min(1400).max(2200).nullish().transform((value) => value ?? null),
  isbn13: isbnSchema(13),
  isbn10: isbnSchema(10),
});

const RELATIONSHIP_TYPES = ["IS_A", "PART_OF", "DERIVED_FROM", "PROCESSED_FROM"] as const;

/**
 * @example
 * { name: "Chicken", description: null, conceptId: "0193...", traversal: ["IS_A", "PART_OF"] }
 */
export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: optionalText(500),
  conceptId: z.uuid().nullish().transform((value) => value ?? null),
  traversal: z
    .array(z.enum(RELATIONSHIP_TYPES))
    .min(1, "Pick at least one relationship")
    .max(4)
    .nullish()
    .transform((value) => value ?? undefined),
});

export const categoryMembershipSchema = z.object({
  noteId: z.string().min(1),
  categoryId: z.string().min(1),
});

export const addCategorySchema = z
  .object({
    noteId: z.string().min(1),
    categoryId: z.string().min(1).nullish(),
    categoryName: z.string().trim().min(1).max(100).nullish(),
  })
  .refine((input) => Boolean(input.categoryId || input.categoryName), {
    message: "Pick a category or type a name",
    path: ["categoryName"],
  });

/** Normalizes a 1-based page argument. */
export function toPage(page: number | null | undefined): number {
  return typeof page === "number" && Number.isInteger(page) && page > 0
    ? page
    : 1;
}

/** Treats null and blank strings as absent filters. */
export function toFilter(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function pluralDiffersFromName({
  name,
  plural,
}: {
  name: string;
  plural: string | null;
}): boolean {
  return !plural || plural.toLowerCase() !== name.toLowerCase();
}

const pluralRefinement = {
  message: "Plural must be different from the name",
  path: ["plural"],
};

const ingredientNameSchema = z.string().trim().min(1, "Name is required").max(200);
const ingredientPluralSchema = optionalText(200);

export const INGREDIENT_PROPERTY_VALUES = [
  "VEGAN",
  "VEGETARIAN",
  "GLUTEN_FREE",
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
  "GLUTEN",
  "NUTS",
  "SHELLFISH",
  "SOY",
  "SESAME",
  "CORN",
  "ALCOHOL",
] as const;

const COMPUTED_PROPERTIES = new Set<string>(["VEGAN", "VEGETARIAN", "GLUTEN_FREE"]);

/** Vegan, vegetarian, and gluten-free are automatic tags, so a save never stores them. */
function isStoredProperty<T extends (typeof INGREDIENT_PROPERTY_VALUES)[number]>(
  value: T
): value is Exclude<T, "VEGAN" | "VEGETARIAN" | "GLUTEN_FREE"> {
  return !COMPUTED_PROPERTIES.has(value);
}

export const ingredientCreateSchema = z
  .object({ name: ingredientNameSchema, plural: ingredientPluralSchema })
  .refine(pluralDiffersFromName, pluralRefinement);

/**
 * @example
 * { id: "0193...", name: "green onion", plural: "green onions", properties: ["VEGAN"], isComposedIngredient: false, relationships: [{ ingredientId: "0193...", relationshipType: "IS_A" }], substitutionIds: [], aliases: ["scallion"], categories: ["Produce"], tags: [], markReviewed: true, advanceToNext: false }
 */
export const ingredientSaveSchema = z
  .object({
    id: z.uuid(),
    name: ingredientNameSchema,
    plural: ingredientPluralSchema,
    properties: z
      .array(z.enum(INGREDIENT_PROPERTY_VALUES))
      .transform((values) => values.filter(isStoredProperty)),
    excludedProperties: z
      .array(z.enum(INGREDIENT_PROPERTY_VALUES))
      .nullish()
      .transform((values) => (values ?? []).filter(isStoredProperty)),
    isComposedIngredient: z.boolean(),
    relationships: z
      .array(
        z.object({
          ingredientId: z.uuid(),
          relationshipType: z.enum(["IS_A", "PART_OF", "DERIVED_FROM", "PROCESSED_FROM"]),
        })
      )
      .max(20),
    substitutionIds: z.array(z.uuid()).max(50),
    aliases: z.array(z.string().trim().min(1).max(200)).max(50),
    categories: z.array(z.string().trim().min(1).max(100)).max(20),
    tags: z.array(z.string().trim().min(1).max(100)).max(50),
    markReviewed: z.boolean(),
    advanceToNext: z.boolean(),
  })
  .refine(pluralDiffersFromName, pluralRefinement)
  .refine((input) => input.relationships.every((relation) => relation.ingredientId !== input.id), {
    message: "An ingredient cannot relate to itself",
    path: ["relationships"],
  });

import { z } from "zod";

export const MAX_SEARCH_QUERY_LENGTH = 100;

const PROPERTY_VALUES = [
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
  "NUTS",
  "SHELLFISH",
  "SOY",
  "SESAME",
  "CORN",
  "ALCOHOL",
] as const;

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

const nameSchema = z.string().trim().min(1, "Name is required").max(200);
const pluralSchema = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .transform((value) => (value ? value : null));

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

export const ingredientCreateSchema = z
  .object({ name: nameSchema, plural: pluralSchema })
  .refine(pluralDiffersFromName, pluralRefinement);

export const ingredientSaveSchema = z
  .object({
    id: z.string().min(1),
    name: nameSchema,
    plural: pluralSchema,
    properties: z.array(z.enum(PROPERTY_VALUES)),
    isComposedIngredient: z.boolean(),
    parentIngredientId: z.string().min(1).nullish().transform((v) => v ?? null),
    substitutionIds: z.array(z.string().min(1)),
    aliases: z.array(z.string().trim().min(1).max(200)),
    category: z
      .string()
      .trim()
      .max(100)
      .nullish()
      .transform((value) => (value ? value : null)),
    tags: z.array(z.string().trim().min(1).max(100)),
    markReviewed: z.boolean(),
    advanceToNext: z.boolean(),
  })
  .refine(pluralDiffersFromName, pluralRefinement);

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

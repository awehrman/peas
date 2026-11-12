"use server";

import { revalidatePath } from "next/cache";

import {
  createIngredient,
  getNextUnreviewedIngredientId,
  saveIngredientDetails,
  searchIngredients,
} from "@peas/database";
import {
  INGREDIENT_PROPERTIES,
  type IngredientCreateInput,
  type IngredientOption,
  type IngredientProperty,
  type IngredientSaveInput,
  type MutationResult,
} from "@peas/features";
import { z } from "zod";

import { ingredientsPath } from "@/paths";

import { getAuthOrRedirect } from "../../auth/queries/get-auth-or-redirect";
import { toMutationError } from "../../shared/to-mutation-error";

const knownProperties: readonly string[] = INGREDIENT_PROPERTIES;

const propertySchema = z.custom<IngredientProperty>(
  (value) => typeof value === "string" && knownProperties.includes(value),
  "Unknown ingredient property"
);

const namesSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    plural: z.string().trim().max(200).nullable(),
  })
  .refine(
    ({ name, plural }) => !plural || plural.toLowerCase() !== name.toLowerCase(),
    { message: "Plural must be different from the name", path: ["plural"] }
  );

const saveSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, "Name is required").max(200),
    plural: z.string().trim().max(200).nullable(),
    properties: z.array(propertySchema),
    isComposedIngredient: z.boolean(),
    parentIngredientId: z.string().min(1).nullable(),
    substitutionIds: z.array(z.string().min(1)),
    aliases: z.array(z.string().trim().min(1).max(200)),
    category: z.string().trim().max(100).nullable(),
    tags: z.array(z.string().trim().min(1).max(100)),
    markReviewed: z.boolean(),
    advanceToNext: z.boolean(),
  })
  .refine(
    ({ name, plural }) => !plural || plural.toLowerCase() !== name.toLowerCase(),
    { message: "Plural must be different from the name", path: ["plural"] }
  );

export async function saveIngredientAction(
  input: IngredientSaveInput
): Promise<MutationResult<{ nextId: string | null }>> {
  await getAuthOrRedirect();

  try {
    const { advanceToNext, ...data } = saveSchema.parse(input);
    const saved = await saveIngredientDetails(data);
    const nextId = advanceToNext
      ? await getNextUnreviewedIngredientId(saved.name, saved.id)
      : null;

    revalidatePath(ingredientsPath());
    return { success: true, data: { nextId } };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function createIngredientAction(
  input: IngredientCreateInput
): Promise<MutationResult<{ id: string }>> {
  await getAuthOrRedirect();

  try {
    const data = namesSchema.parse(input);
    const created = await createIngredient(data);
    revalidatePath(ingredientsPath());
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function searchIngredientsAction(
  query: string,
  excludeId?: string
): Promise<IngredientOption[]> {
  await getAuthOrRedirect();

  const parsedQuery = z.string().max(100).safeParse(query);
  if (!parsedQuery.success) return [];

  return searchIngredients(parsedQuery.data, excludeId);
}

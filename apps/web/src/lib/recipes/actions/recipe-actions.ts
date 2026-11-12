"use server";

import { revalidatePath } from "next/cache";

import {
  promoteCompletedNotesToRecipes,
  promoteNoteToRecipe,
  updateRecipe,
} from "@peas/database";
import type { MutationResult, RecipeUpdateInput } from "@peas/features";
import { z } from "zod";

import { notePath, notesPath, recipePath, recipesPath } from "@/paths";

import { getAuthOrRedirect } from "../../auth/queries/get-auth-or-redirect";
import { requireAdmin } from "../../auth/queries/require-admin";
import { toMutationError } from "../../shared/to-mutation-error";

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(300),
  categories: z.array(z.string().trim().min(1).max(100)).max(50),
  tags: z.array(z.string().trim().min(1).max(100)).max(50),
});

export async function promoteNoteToRecipeAction(
  noteId: string
): Promise<MutationResult<{ recipeId: string }>> {
  await getAuthOrRedirect();

  try {
    const id = z.string().min(1).parse(noteId);
    const recipe = await promoteNoteToRecipe(id);
    revalidatePath(notePath(id));
    revalidatePath(recipesPath());
    return { success: true, data: { recipeId: recipe.id } };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function promoteCompletedNotesAction(): Promise<
  MutationResult<{ created: number }>
> {
  try {
    await requireAdmin();
    const result = await promoteCompletedNotesToRecipes();
    revalidatePath(recipesPath());
    revalidatePath(notesPath());
    return { success: true, data: result };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function updateRecipeAction(
  input: RecipeUpdateInput
): Promise<MutationResult> {
  await getAuthOrRedirect();

  try {
    const data = updateSchema.parse(input);
    await updateRecipe(data);
    revalidatePath(recipePath(data.id));
    revalidatePath(recipesPath());
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}

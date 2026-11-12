import {
  cleanupAllData,
  createIngredient,
  getNextUnreviewedIngredientId,
  getNoteDetail,
  promoteCompletedNotesToRecipes,
  promoteNoteToRecipe,
  saveIngredientDetails,
  setIngredientLineReviewStatus,
  updateRecipe,
} from "@peas/database";

import { cleanupR2Prefixes } from "../admin/cleanup-r2";
import { isAdmin, requireViewer } from "../context";
import { INVALIDATION_DOMAINS, createMutationEffect } from "../effects";
import type { MutationResolvers } from "../generated/resolvers-types";
import { failure, toFailurePayload } from "./payload";
import {
  idSchema,
  ingredientCreateSchema,
  ingredientSaveSchema,
  lineReviewInputSchema,
  recipeUpdateSchema,
} from "./validation";

const R2_CLEANUP_PREFIXES = ["originals/", "processed/"];

export const Mutation: MutationResolvers = {
  setLineReviewStatus: async (_parent, args, context) => {
    requireViewer(context);

    try {
      const input = lineReviewInputSchema.parse(args);
      const line = await setIngredientLineReviewStatus(
        input.lineId,
        input.status
      );
      const note = line.noteId ? await getNoteDetail(line.noteId) : null;

      return {
        __typename: "SetLineReviewStatusPayload",
        success: true,
        note,
        effect: createMutationEffect({
          changed: note ? [] : [{ typename: "IngredientLine", id: line.id }],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  promoteNoteToRecipe: async (_parent, args, context) => {
    requireViewer(context);

    try {
      const noteId = idSchema.parse(args.noteId);
      const recipe = await promoteNoteToRecipe(noteId);

      return {
        __typename: "PromoteNotePayload",
        success: true,
        recipeId: recipe.id,
        effect: createMutationEffect({
          changed: [
            { typename: "Note", id: noteId },
            { typename: "NoteSummary", id: noteId },
          ],
          invalidatedDomains: ["RECIPES", "RECIPE_TAXONOMY"],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  promoteCompletedNotes: async (_parent, _args, context) => {
    const viewer = requireViewer(context);
    if (!isAdmin(viewer)) return failure("Only admins can perform this action");

    try {
      const { created } = await promoteCompletedNotesToRecipes();

      return {
        __typename: "PromoteCompletedNotesPayload",
        success: true,
        created,
        effect: createMutationEffect({
          invalidatedDomains: [
            "NOTES",
            "NOTE_DETAIL",
            "RECIPES",
            "RECIPE_TAXONOMY",
          ],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  updateRecipe: async (_parent, { input }, context) => {
    requireViewer(context);

    try {
      const data = recipeUpdateSchema.parse(input);
      await updateRecipe(data);

      return {
        __typename: "BasicPayload",
        success: true,
        effect: createMutationEffect({
          changed: [{ typename: "Recipe", id: data.id }],
          invalidatedDomains: ["RECIPES", "RECIPE_TAXONOMY"],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  saveIngredient: async (_parent, { input }, context) => {
    requireViewer(context);

    try {
      const { advanceToNext, ...data } = ingredientSaveSchema.parse(input);
      const saved = await saveIngredientDetails(data);
      const nextId = advanceToNext
        ? await getNextUnreviewedIngredientId(saved.name, saved.id)
        : null;

      return {
        __typename: "SaveIngredientPayload",
        success: true,
        nextId,
        effect: createMutationEffect({
          changed: [{ typename: "Ingredient", id: saved.id }],
          invalidatedDomains: ["INGREDIENTS", "INGREDIENT_DETAIL"],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  createIngredient: async (_parent, { input }, context) => {
    requireViewer(context);

    try {
      const data = ingredientCreateSchema.parse(input);
      const created = await createIngredient(data);

      return {
        __typename: "CreateIngredientPayload",
        success: true,
        id: created.id,
        effect: createMutationEffect({ invalidatedDomains: ["INGREDIENTS"] }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  cleanupAllData: async (_parent, _args, context) => {
    const viewer = requireViewer(context);
    if (!isAdmin(viewer)) return failure("Only admins can delete all data");

    try {
      console.warn(
        `DANGEROUS OPERATION: ${viewer.email} is cleaning up all database data`
      );
      const { deletedCounts } = await cleanupAllData();
      const r2Result = await cleanupR2Prefixes(R2_CLEANUP_PREFIXES);

      return {
        __typename: "CleanupAllDataPayload",
        success: true,
        message:
          "All data has been deleted from the database" +
          (r2Result ? " and R2 cleaned" : ""),
        deletedCounts: Object.entries(deletedCounts).map(([key, count]) => ({
          key,
          count,
        })),
        effect: createMutationEffect({
          invalidatedDomains: [...INVALIDATION_DOMAINS],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },
};

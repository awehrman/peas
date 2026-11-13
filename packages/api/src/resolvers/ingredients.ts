import { toFailurePayload } from "./payload";
import { followUpDecision } from "./teach";
import {
  MAX_SEARCH_QUERY_LENGTH,
  idSchema,
  ingredientCreateSchema,
  ingredientSaveSchema,
} from "./validation";

import {
  createIngredientConcept,
  findIngredientNameOwner,
  getIngredientCard,
  getIngredientCardCounts,
  getIngredientCategoryOptions,
  listIngredientSummaries,
  saveIngredientCard,
  searchIngredientOptions,
} from "@peas/database";
import { z } from "zod";

import { requireViewer } from "../context";
import { KNOWLEDGE_DOMAINS, createMutationEffect } from "../effects";
import type {
  MutationResolvers,
  QueryResolvers,
} from "../generated/resolvers-types";

const conceptIdSchema = z.uuid();

/**
 * The ingredients page (the original ingredient card view), backed by food concepts: approved foods in "all", proposed ones in "unreviewed".
 */
export const IngredientQuery: Pick<
  QueryResolvers,
  | "ingredients"
  | "ingredientCounts"
  | "ingredient"
  | "ingredientCategoryNames"
  | "searchIngredients"
  | "ingredientNameOwner"
> = {
  ingredients: (_parent, { view }, context) => {
    requireViewer(context);
    return listIngredientSummaries(view);
  },

  ingredientCounts: (_parent, _args, context) => {
    requireViewer(context);
    return getIngredientCardCounts();
  },

  ingredient: (_parent, { id }, context) => {
    requireViewer(context);
    const parsed = conceptIdSchema.safeParse(idSchema.parse(id));
    return parsed.success ? getIngredientCard(parsed.data) : null;
  },

  ingredientCategoryNames: (_parent, _args, context) => {
    requireViewer(context);
    return getIngredientCategoryOptions();
  },

  searchIngredients: (_parent, { query, excludeId }, context) => {
    requireViewer(context);
    if (query.length > MAX_SEARCH_QUERY_LENGTH) return [];
    return searchIngredientOptions(query, excludeId ?? undefined);
  },

  ingredientNameOwner: (_parent, { name, excludeId }, context) => {
    requireViewer(context);
    if (name.length > MAX_SEARCH_QUERY_LENGTH) return null;
    const exclude = excludeId ? conceptIdSchema.safeParse(excludeId) : null;
    return findIngredientNameOwner(name, exclude?.success ? exclude.data : undefined);
  },
};

export const IngredientMutation: Pick<
  MutationResolvers,
  "saveIngredient" | "createIngredient"
> = {
  saveIngredient: async (_parent, { input }, context) => {
    const viewer = requireViewer(context);
    try {
      const { advanceToNext, ...data } = ingredientSaveSchema.parse(input);
      const { decisions, nextId } = await saveIngredientCard(
        { ...data, advanceToNext },
        viewer.id
      );
      let reprocessingJobId: string | null = null;
      for (const applied of decisions) {
        const followUp = await followUpDecision(applied, viewer.id);
        reprocessingJobId = followUp.reprocessingJobId ?? reprocessingJobId;
      }
      const lastRevision = decisions.at(-1)?.revision ?? null;
      return {
        __typename: "SaveIngredientPayload",
        success: true,
        nextId,
        effect: createMutationEffect({
          changed: [
            { typename: "Ingredient", id: data.id },
            { typename: "Concept", id: data.id },
          ],
          invalidatedDomains:
            decisions.length > 0
              ? [...KNOWLEDGE_DOMAINS]
              : ["CONCEPTS", "CONCEPT_DETAIL"],
          lexiconRevision: lastRevision,
          reprocessingJobId,
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  createIngredient: async (_parent, { input }, context) => {
    const viewer = requireViewer(context);
    try {
      const data = ingredientCreateSchema.parse(input);
      const { id, decision } = await createIngredientConcept(data, viewer.id);
      const { reprocessingJobId } = await followUpDecision(decision, viewer.id);
      return {
        __typename: "CreateIngredientPayload",
        success: true,
        id,
        effect: createMutationEffect({
          invalidatedDomains: [...KNOWLEDGE_DOMAINS],
          lexiconRevision: decision.revision,
          reprocessingJobId,
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },
};

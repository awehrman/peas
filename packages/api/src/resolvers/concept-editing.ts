import { failure, toFailurePayload } from "./payload";
import {
  conceptClassificationSchema,
  conceptSubstitutionSchema,
  conceptTagsSchema,
} from "./validation";

import {
  prisma,
  removeClassification,
  removeSubstitution,
  setClassification,
  setConceptTags,
  setSubstitution,
} from "@peas/database";
import { z } from "zod";

import { type ApiContext, canCurateKnowledge, requireViewer } from "../context";
import { createMutationEffect } from "../effects";
import type { MutationResolvers } from "../generated/resolvers-types";

const conceptIdSchema = z.uuid();
const ONLY_ADMINS = "You can't edit concepts yet";

/** Other concepts can inherit classifications and list substitutions, so every open concept page may be stale. */
function conceptChanged(...conceptIds: string[]) {
  return createMutationEffect({
    changed: conceptIds.map((id) => ({ typename: "Concept", id })),
    invalidatedDomains: ["CONCEPT_DETAIL"],
  });
}

function canEdit(context: ApiContext): boolean {
  return canCurateKnowledge(requireViewer(context));
}

/**
 * Concept page editing (Phase 5e): classifications, tags, and substitutions. These don't change how lines resolve, so they skip the decision log and the lexicon revision.
 */
export const ConceptEditingMutation: Pick<
  MutationResolvers,
  | "setConceptClassification"
  | "removeConceptClassification"
  | "setConceptTags"
  | "setConceptSubstitution"
  | "removeConceptSubstitution"
> = {
  setConceptClassification: async (_parent, { input }, context) => {
    if (!canEdit(context)) return failure(ONLY_ADMINS);
    try {
      const data = conceptClassificationSchema.parse(input);
      await setClassification(prisma, data);
      return {
        __typename: "BasicPayload",
        success: true,
        effect: conceptChanged(data.conceptId),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  removeConceptClassification: async (_parent, { conceptId, key }, context) => {
    if (!canEdit(context)) return failure(ONLY_ADMINS);
    try {
      const id = conceptIdSchema.parse(conceptId);
      const removed = await removeClassification(id, key);
      if (!removed) return failure(`“${key}” is not set on this concept`);
      return {
        __typename: "BasicPayload",
        success: true,
        effect: conceptChanged(id),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  setConceptTags: async (_parent, args, context) => {
    if (!canEdit(context)) return failure(ONLY_ADMINS);
    try {
      const { conceptId, tags } = conceptTagsSchema.parse(args);
      await setConceptTags(conceptId, tags);
      return {
        __typename: "BasicPayload",
        success: true,
        effect: conceptChanged(conceptId),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  setConceptSubstitution: async (_parent, { input }, context) => {
    if (!canEdit(context)) return failure(ONLY_ADMINS);
    try {
      const data = conceptSubstitutionSchema.parse(input);
      await setSubstitution({
        fromConceptId: data.conceptId,
        toConceptId: data.substituteId,
        ratio: data.ratio,
        note: data.note,
      });
      return {
        __typename: "BasicPayload",
        success: true,
        effect: conceptChanged(data.conceptId),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  removeConceptSubstitution: async (
    _parent,
    { conceptId, substituteId },
    context
  ) => {
    if (!canEdit(context)) return failure(ONLY_ADMINS);
    try {
      const from = conceptIdSchema.parse(conceptId);
      const removed = await removeSubstitution(
        from,
        conceptIdSchema.parse(substituteId)
      );
      if (!removed) return failure("That substitution no longer exists");
      return {
        __typename: "BasicPayload",
        success: true,
        effect: conceptChanged(from),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },
};

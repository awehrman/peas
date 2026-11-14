import { failure, toFailurePayload } from "./payload";
import {
  addCategorySchema,
  categoryInputSchema,
  categoryMembershipSchema,
  duplicateResolutionSchema,
  idSchema,
  manualBookSchema,
  toPage,
} from "./validation";

import {
  type BookLookupStatus,
  addCategoryToNote,
  approveCategory,
  createBookManually,
  createCategory,
  excludeCategory,
  getBookLookup,
  getCategory,
  getDuplicateCandidate,
  getImportReviewCounts,
  leaveBookUnresolved,
  listBookLookups,
  listCategories,
  listDuplicateCandidates,
  listFailedUrlChecks,
  previewCategoryRule,
  previewDuplicateResolution,
  removeCategory,
  resetBookLookup,
  resolveDuplicate,
  resolveExactDuplicatesBatch,
  restoreCategory,
  selectBookCandidate,
  undoDuplicateResolution,
  updateCategoryRule,
} from "@peas/database";

import { z } from "zod";

import { isAdmin, requireViewer } from "../context";
import { type EntityRef, type InvalidationDomain, createMutationEffect } from "../effects";
import type { MutationResolvers, QueryResolvers } from "../generated/resolvers-types";
import { requestBookLookup, requestCategoryRecompute, requestUrlRecheck } from "../queue-client";

const REVIEW_LOOKUP_STATUSES: BookLookupStatus[] = ["AMBIGUOUS", "NO_MATCH", "ERROR"];

/** Every view a source or duplicate decision can change: both notes, their recipes, the lists, and the review tab. */
const IMPORT_DOMAINS: InvalidationDomain[] = [
  "IMPORT_REVIEW",
  "NOTES",
  "NOTE_DETAIL",
  "RECIPES",
  "RECIPE_DETAIL",
  "RECIPE_TAXONOMY",
  "DASHBOARD_STATS",
  "IMPORT_STATS",
];

/** Category decisions change the note and recipe pages, recipe lists and filters, and category counts. */
const CATEGORY_DOMAINS: InvalidationDomain[] = [
  "CATEGORIES",
  "NOTE_DETAIL",
  "RECIPES",
  "RECIPE_DETAIL",
  "RECIPE_TAXONOMY",
  "DASHBOARD_STATS",
];

function noteRefs(noteIds: readonly string[]): EntityRef[] {
  return noteIds.flatMap((id) => [
    { typename: "Note", id },
    { typename: "NoteSummary", id },
  ]);
}

export const ImportIntegrityQuery: Pick<
  QueryResolvers,
  | "importReviewCounts"
  | "duplicateCandidates"
  | "duplicateCandidate"
  | "previewDuplicateResolution"
  | "bookLookups"
  | "bookLookup"
  | "failedUrlChecks"
  | "categories"
  | "category"
  | "previewCategoryRule"
> = {
  importReviewCounts: (_parent, _args, context) => {
    requireViewer(context);
    return getImportReviewCounts();
  },

  duplicateCandidates: (_parent, args, context) => {
    requireViewer(context);
    return listDuplicateCandidates({
      kinds: args.kind ? [args.kind] : undefined,
      statuses: args.status
        ? args.status === "PENDING"
          ? ["PENDING"]
          : ["RESOLVED", "DISMISSED"]
        : ["PENDING"],
      sourceConflictsOnly: args.sourceConflicts ?? false,
      page: toPage(args.page),
    });
  },

  duplicateCandidate: async (_parent, { id }, context) => {
    requireViewer(context);
    const detail = await getDuplicateCandidate(idSchema.parse(id));
    if (!detail) return null;
    const { incomingNote, existingNote, ...candidate } = detail;
    return { id: detail.id, candidate, incomingNote, existingNote };
  },

  previewDuplicateResolution: (_parent, { id, input }, context) => {
    requireViewer(context);
    return previewDuplicateResolution(idSchema.parse(id), duplicateResolutionSchema.parse(input));
  },

  bookLookups: (_parent, args, context) => {
    requireViewer(context);
    return listBookLookups({
      statuses: args.statuses?.length ? args.statuses : REVIEW_LOOKUP_STATUSES,
      page: toPage(args.page),
    });
  },

  bookLookup: (_parent, { id }, context) => {
    requireViewer(context);
    return getBookLookup(idSchema.parse(id));
  },

  failedUrlChecks: (_parent, args, context) => {
    requireViewer(context);
    return listFailedUrlChecks({ page: toPage(args.page) });
  },

  categories: (_parent, _args, context) => {
    requireViewer(context);
    return listCategories();
  },

  category: (_parent, { id }, context) => {
    requireViewer(context);
    return getCategory(idSchema.parse(id));
  },

  previewCategoryRule: (_parent, { conceptId, traversal }, context) => {
    requireViewer(context);
    return previewCategoryRule(z.uuid().parse(conceptId), traversal);
  },
};

export const ImportIntegrityMutation: Pick<
  MutationResolvers,
  | "resolveDuplicate"
  | "undoDuplicateResolution"
  | "resolveExactDuplicates"
  | "selectBookCandidate"
  | "createBookManually"
  | "leaveBookUnresolved"
  | "retryBookLookup"
  | "recheckUrl"
  | "addCategoryToNote"
  | "approveCategory"
  | "excludeCategory"
  | "restoreCategory"
  | "removeCategory"
  | "createCategory"
  | "updateCategoryRule"
> = {
  resolveDuplicate: async (_parent, { id, input }, context) => {
    const viewer = requireViewer(context);
    try {
      const result = await resolveDuplicate(
        idSchema.parse(id),
        duplicateResolutionSchema.parse(input),
        viewer.id
      );
      return {
        __typename: "ResolveDuplicatePayload",
        success: true,
        message: result.alreadyResolved ? "This decision was already applied" : null,
        preview: result.preview,
        effect: createMutationEffect(
          { changed: noteRefs(result.noteIds), invalidatedDomains: [...IMPORT_DOMAINS, "CATEGORIES"] },
          IMPORT_DOMAINS
        ),
      };
    } catch (error) {
      return { ...toFailurePayload(error), preview: null };
    }
  },

  undoDuplicateResolution: async (_parent, { id }, context) => {
    requireViewer(context);
    try {
      const { noteIds } = await undoDuplicateResolution(idSchema.parse(id));
      return {
        __typename: "BasicPayload",
        success: true,
        effect: createMutationEffect({
          changed: noteRefs(noteIds),
          invalidatedDomains: [...IMPORT_DOMAINS, "CATEGORIES"],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  resolveExactDuplicates: async (_parent, _args, context) => {
    const viewer = requireViewer(context);
    try {
      const result = await resolveExactDuplicatesBatch(viewer.id);
      return {
        __typename: "ResolveExactDuplicatesPayload",
        success: true,
        resolved: result.resolved,
        failed: result.failed,
        effect: createMutationEffect(
          { changed: noteRefs(result.noteIds), invalidatedDomains: [...IMPORT_DOMAINS, "CATEGORIES"] },
          IMPORT_DOMAINS
        ),
      };
    } catch (error) {
      return { ...toFailurePayload(error), resolved: null, failed: null };
    }
  },

  selectBookCandidate: async (_parent, { lookupId, workKey }, context) => {
    const viewer = requireViewer(context);
    try {
      const { noteIds } = await selectBookCandidate(idSchema.parse(lookupId), idSchema.parse(workKey), viewer.id);
      return {
        __typename: "BasicPayload",
        success: true,
        effect: createMutationEffect({ changed: noteRefs(noteIds), invalidatedDomains: IMPORT_DOMAINS }, IMPORT_DOMAINS),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  createBookManually: async (_parent, { lookupId, input }, context) => {
    const viewer = requireViewer(context);
    try {
      const { noteIds } = await createBookManually(
        idSchema.parse(lookupId),
        manualBookSchema.parse(input),
        viewer.id
      );
      return {
        __typename: "BasicPayload",
        success: true,
        effect: createMutationEffect({ changed: noteRefs(noteIds), invalidatedDomains: IMPORT_DOMAINS }, IMPORT_DOMAINS),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  leaveBookUnresolved: async (_parent, { lookupId }, context) => {
    requireViewer(context);
    try {
      await leaveBookUnresolved(idSchema.parse(lookupId));
      return {
        __typename: "BasicPayload",
        success: true,
        effect: createMutationEffect({ invalidatedDomains: ["IMPORT_REVIEW", "NOTE_DETAIL", "RECIPE_DETAIL"] }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  retryBookLookup: async (_parent, { lookupId }, context) => {
    const viewer = requireViewer(context);
    try {
      const id = idSchema.parse(lookupId);
      await resetBookLookup(id);
      await requestBookLookup(id, viewer.id);
      return {
        __typename: "BasicPayload",
        success: true,
        message: "Lookup queued",
        effect: createMutationEffect({ invalidatedDomains: ["IMPORT_REVIEW"] }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  recheckUrl: async (_parent, { urlId }, context) => {
    const viewer = requireViewer(context);
    try {
      await requestUrlRecheck(idSchema.parse(urlId), viewer.id);
      return {
        __typename: "BasicPayload",
        success: true,
        message: "Check queued; the result appears in a few seconds",
        effect: createMutationEffect(),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  addCategoryToNote: async (_parent, args, context) => {
    const viewer = requireViewer(context);
    try {
      const input = addCategorySchema.parse(args);
      await addCategoryToNote({
        noteId: input.noteId,
        categoryId: input.categoryId ?? undefined,
        categoryName: input.categoryName ?? undefined,
        userId: viewer.id,
      });
      return {
        __typename: "BasicPayload",
        success: true,
        effect: createMutationEffect({ changed: noteRefs([input.noteId]), invalidatedDomains: CATEGORY_DOMAINS }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  approveCategory: async (_parent, args, context) => categoryDecision(context, args, approveCategory),
  excludeCategory: async (_parent, args, context) => categoryDecision(context, args, excludeCategory),
  restoreCategory: async (_parent, args, context) => categoryDecision(context, args, restoreCategory),
  removeCategory: async (_parent, args, context) => categoryDecision(context, args, removeCategory),

  createCategory: async (_parent, { input }, context) => {
    const viewer = requireViewer(context);
    if (!isAdmin(viewer)) return { ...failure("Only admins can create categories"), id: null };
    try {
      const data = categoryInputSchema.parse(input);
      const { id } = await createCategory(data);
      if (data.conceptId) void requestCategoryRecompute({ categoryId: id }, viewer.id);
      return {
        __typename: "CreateCategoryPayload",
        success: true,
        id,
        message: data.conceptId ? "Members are being inferred in the background" : null,
        effect: createMutationEffect({ invalidatedDomains: CATEGORY_DOMAINS }),
      };
    } catch (error) {
      return { ...toFailurePayload(error), id: null };
    }
  },

  updateCategoryRule: async (_parent, { id, input }, context) => {
    const viewer = requireViewer(context);
    if (!isAdmin(viewer)) return failure("Only admins can change categories");
    try {
      const categoryId = idSchema.parse(id);
      const { ruleChanged } = await updateCategoryRule(categoryId, categoryInputSchema.parse(input));
      if (ruleChanged) void requestCategoryRecompute({ categoryId }, viewer.id);
      return {
        __typename: "BasicPayload",
        success: true,
        message: ruleChanged ? "Members are being recomputed in the background" : null,
        effect: createMutationEffect({ invalidatedDomains: CATEGORY_DOMAINS }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },
};

async function categoryDecision(
  context: Parameters<typeof requireViewer>[0],
  args: { noteId: string; categoryId: string },
  decide: (input: { noteId: string; categoryId: string; userId: string | null }) => Promise<unknown>
) {
  const viewer = requireViewer(context);
  try {
    const input = categoryMembershipSchema.parse(args);
    await decide({ ...input, userId: viewer.id });
    return {
      __typename: "BasicPayload" as const,
      success: true,
      effect: createMutationEffect({ changed: noteRefs([input.noteId]), invalidatedDomains: CATEGORY_DOMAINS }),
    };
  } catch (error) {
    return toFailurePayload(error);
  }
}

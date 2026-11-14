import {
  recomputeAllConceptCategories,
  recomputeCategory,
  recomputeNoteCategories,
} from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";

/**
 * Brings a note's inferred categories in line with its parsed ingredients. Reviewer decisions (approved, excluded) are never changed.
 *
 * @example
 * await recomputeCategoriesForNote({ noteId, importId, jobId }, logger)
 */
export async function recomputeCategoriesForNote(
  data: CategorizationJobData,
  logger: StructuredLogger
): Promise<CategorizationJobData> {
  if (!data.noteId) throw new Error("A noteId is required to recompute its categories");
  const summary = await recomputeNoteCategories(data.noteId);
  logger.log(
    `[RECOMPUTE_CATEGORIES] note ${data.noteId}: +${summary.added} ~${summary.updated} -${summary.removed}`
  );
  return { ...data, metadata: { ...data.metadata, categorySummary: summary } };
}

export async function recomputeOneCategory(
  data: CategorizationJobData,
  logger: StructuredLogger
): Promise<CategorizationJobData> {
  if (!data.categoryId) throw new Error("A categoryId is required");
  const summary = await recomputeCategory(data.categoryId);
  logger.log(
    `[RECOMPUTE_CATEGORIES] category ${data.categoryId}: +${summary.added} ~${summary.updated} -${summary.removed}`
  );
  return { ...data, metadata: { ...data.metadata, categorySummary: summary } };
}

export async function recomputeEveryCategory(
  data: CategorizationJobData,
  logger: StructuredLogger
): Promise<CategorizationJobData> {
  const summary = await recomputeAllConceptCategories();
  logger.log(
    `[RECOMPUTE_CATEGORIES] all categories: +${summary.added} ~${summary.updated} -${summary.removed}`
  );
  return { ...data, metadata: { ...data.metadata, categorySummary: summary } };
}

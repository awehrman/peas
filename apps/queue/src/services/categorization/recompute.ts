import type { Queue } from "bullmq";

import type { CategorizationJobData } from "../../workers/categorization/dependencies";

const RECOMPUTE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: 50,
};

export type CategoryRecomputeScope =
  | { scope: "NOTE"; noteId: string }
  | { scope: "CATEGORY"; categoryId: string; ruleVersion: number }
  | { scope: "ALL"; reason: string };

function jobFor(request: CategoryRecomputeScope): { jobId: string; data: CategorizationJobData } {
  switch (request.scope) {
    case "NOTE": {
      const jobId = `categories-note-${request.noteId}`;
      return { jobId, data: { kind: "RECOMPUTE_NOTE_CATEGORIES", noteId: request.noteId, importId: "", jobId } };
    }
    case "CATEGORY": {
      const jobId = `categories-category-${request.categoryId}-v${request.ruleVersion}`;
      return {
        jobId,
        data: { kind: "RECOMPUTE_CATEGORY", categoryId: request.categoryId, noteId: "", importId: "", jobId },
      };
    }
    case "ALL": {
      const jobId = `categories-all-${request.reason.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      return { jobId, data: { kind: "RECOMPUTE_ALL_CATEGORIES", noteId: "", importId: "", jobId } };
    }
  }
}

/**
 * Queues a category recomputation on the categorization queue. Job ids carry what makes the request distinct (note, rule version, revision), so repeated requests for the same change collapse.
 *
 * @example
 * await enqueueCategoryRecompute(queue, { scope: "ALL", reason: "revision-15" }) // "categories-all-revision-15"
 */
export async function enqueueCategoryRecompute(
  queue: Pick<Queue, "add">,
  request: CategoryRecomputeScope
): Promise<string> {
  const { jobId, data } = jobFor(request);
  await queue.add("recompute-categories", data, { jobId, ...RECOMPUTE_JOB_OPTIONS });
  return jobId;
}

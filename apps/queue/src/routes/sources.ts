import { getCategory } from "@peas/database";
import { Router } from "express";
import { z } from "zod";

import { enqueueCategoryRecompute } from "../services/categorization/recompute";
import { ServiceContainer } from "../services/container";
import { enqueueBookLookup, enqueueUrlCheck } from "../services/source/enqueue";
import { HttpStatus } from "../types";

export const sourcesRouter = Router();

const urlCheckSchema = z.object({ urlId: z.string().min(1) });
const bookLookupSchema = z.object({ lookupId: z.uuid() });
const recomputeSchema = z.union([
  z.object({ noteId: z.string().min(1) }),
  z.object({ categoryId: z.string().min(1) }),
  z.object({ all: z.literal(true), reason: z.string().min(1).max(100) }),
]);

function failure(res: Parameters<Parameters<typeof sourcesRouter.post>[1]>[1], error: unknown, fallback: string) {
  res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .json({ success: false, error: error instanceof Error ? error.message : fallback });
}

/**
 * Rechecks one URL now (the Recheck button).
 *
 * @example
 * POST /sources/url-check { "urlId": "cm3u..." } -> 202 { "jobId": "url-check-cm3u..." }
 */
sourcesRouter.post("/url-check", async (req, res) => {
  const parsed = urlCheckSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: "urlId is required" });
    return;
  }
  try {
    const container = await ServiceContainer.getInstance();
    const jobId = await enqueueUrlCheck(container.queues.sourceQueue, parsed.data.urlId);
    res.status(HttpStatus.ACCEPTED).json({ success: true, jobId });
  } catch (error) {
    failure(res, error, "Could not queue the check");
  }
});

/**
 * Runs a book lookup again (Retry on the review page).
 *
 * @example
 * POST /sources/book-lookup { "lookupId": "0193..." } -> 202 { "jobId": "book-lookup-0193..." }
 */
sourcesRouter.post("/book-lookup", async (req, res) => {
  const parsed = bookLookupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: "lookupId must be a UUID" });
    return;
  }
  try {
    const container = await ServiceContainer.getInstance();
    const jobId = await enqueueBookLookup(container.queues.bookLookupQueue, parsed.data.lookupId);
    res.status(HttpStatus.ACCEPTED).json({ success: true, jobId });
  } catch (error) {
    failure(res, error, "Could not queue the lookup");
  }
});

/**
 * Recomputes inferred category memberships for a note, one category (after its rule changed), or every ingredient-rule category (after a knowledge change).
 *
 * @example
 * POST /sources/categories/recompute { "all": true, "reason": "revision-15" } -> 202 { "jobId": "categories-all-revision-15" }
 */
sourcesRouter.post("/categories/recompute", async (req, res) => {
  const parsed = recomputeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: "Give a noteId, a categoryId, or all with a reason" });
    return;
  }
  try {
    const container = await ServiceContainer.getInstance();
    const queue = container.queues.categorizationQueue;
    const body = parsed.data;
    let jobId: string;
    if ("noteId" in body) {
      jobId = await enqueueCategoryRecompute(queue, { scope: "NOTE", noteId: body.noteId });
    } else if ("categoryId" in body) {
      const category = await getCategory(body.categoryId);
      if (!category) {
        res.status(HttpStatus.NOT_FOUND).json({ success: false, error: "Category not found" });
        return;
      }
      jobId = await enqueueCategoryRecompute(queue, {
        scope: "CATEGORY",
        categoryId: category.id,
        ruleVersion: category.ruleVersion,
      });
    } else {
      jobId = await enqueueCategoryRecompute(queue, { scope: "ALL", reason: body.reason });
    }
    res.status(HttpStatus.ACCEPTED).json({ success: true, jobId });
  } catch (error) {
    failure(res, error, "Could not queue the recompute");
  }
});

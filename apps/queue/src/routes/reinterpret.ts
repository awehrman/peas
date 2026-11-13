import { getReinterpretRun, reinterpretJobId, requestReinterpretRun } from "@peas/database";
import { PARSER_VERSION } from "@peas/parser/v2";
import { Router } from "express";
import { z } from "zod";

import { ServiceContainer } from "../services/container";
import { publishLexiconRevision } from "../services/ingredient/lexicon-cache";
import { enqueueSnapshot } from "../services/reinterpret/service";
import { HttpStatus } from "../types";
import type { ReinterpretJobData } from "../workers/reinterpret/dependencies";

export const reinterpretRouter = Router();

const runSchema = z.object({
  revision: z.number().int().positive(),
  phrases: z.array(z.string().min(1)).max(500).default([]),
  conceptIds: z.array(z.string().min(1)).max(500).default([]),
});

const revisionSchema = z.object({ revision: z.number().int().positive() });

const reparseSchema = z.object({
  parserVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
});

const RUN_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

/**
 * Starts (or returns) the background reinterpretation for a lexicon revision. The run id is "reinterpret-<revision>", so repeated requests never start a second run.
 *
 * @example
 * POST /reinterpret { "revision": 15, "phrases": ["icing sugar"], "conceptIds": [] } -> 202 { "jobId": "reinterpret-15", "status": "PENDING" }
 */
reinterpretRouter.post("/", async (req, res) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const { revision, phrases, conceptIds } = parsed.data;
  try {
    const run = await requestReinterpretRun({ kind: "REINTERPRET_BY_REVISION", revision, scope: { phrases, conceptIds } });
    if (run.status === "PENDING") {
      const container = await ServiceContainer.getInstance();
      const data: ReinterpretJobData = { jobId: run.jobId, runJobId: run.jobId, kind: "REINTERPRET_BY_REVISION", revision };
      await container.queues.reinterpretQueue.add("reinterpret-run", data, {
        jobId: run.jobId,
        ...RUN_JOB_OPTIONS,
      });
    }
    await publishLexiconRevision(revision).catch(() => undefined);
    res.status(HttpStatus.ACCEPTED).json({ success: true, jobId: run.jobId, status: run.status });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error instanceof Error ? error.message : "Could not start reinterpretation" });
  }
});

/**
 * Progress of a revision's run.
 *
 * @example
 * GET /reinterpret/15/status -> { "jobId": "reinterpret-15", "status": "PROCESSING", "processedLines": 400, "totalLines": 1200 }
 */
reinterpretRouter.get("/:revision/status", async (req, res) => {
  const revision = Number.parseInt(req.params.revision ?? "", 10);
  if (!Number.isInteger(revision) || revision < 1) {
    res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: "revision must be a positive integer" });
    return;
  }
  const run = await getReinterpretRun(reinterpretJobId({ kind: "REINTERPRET_BY_REVISION", revision }));
  if (!run) {
    res.status(HttpStatus.NOT_FOUND).json({ success: false, error: "No reinterpretation for that revision" });
    return;
  }
  res.json({ success: true, ...run });
});

/**
 * Tells every queue process that the lexicon changed, so their resolver contexts reload now instead of after the 15-second TTL.
 *
 * @example
 * POST /reinterpret/lexicon-revision { "revision": 15 } -> 200 { "success": true }
 */
reinterpretRouter.post("/lexicon-revision", async (req, res) => {
  const parsed = revisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: "revision must be a positive integer" });
    return;
  }
  try {
    await publishLexiconRevision(parsed.data.revision);
    res.json({ success: true });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error instanceof Error ? error.message : "Could not publish the revision" });
  }
});

/**
 * Reparses every line written by another parser version (Phase 6c, step 6): after a grammar change ships, this starts a REPARSE_BY_VERSION run ("reparse-<version>", once per version). Progress is reported like reinterpretation runs.
 *
 * @example
 * POST /reinterpret/reparse {} -> 202 { "jobId": "reparse-2.1.0", "status": "PENDING" }
 */
reinterpretRouter.post("/reparse", async (req, res) => {
  const parsed = reparseSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: "parserVersion must look like 2.1.0" });
    return;
  }
  const parserVersion = parsed.data.parserVersion ?? PARSER_VERSION;
  try {
    const run = await requestReinterpretRun({ kind: "REPARSE_BY_VERSION", parserVersion });
    if (run.status === "PENDING") {
      const container = await ServiceContainer.getInstance();
      const data: ReinterpretJobData = { jobId: run.jobId, runJobId: run.jobId, kind: "REPARSE_BY_VERSION", parserVersion };
      await container.queues.reinterpretQueue.add("reinterpret-run", data, { jobId: run.jobId, ...RUN_JOB_OPTIONS });
    }
    res.status(HttpStatus.ACCEPTED).json({ success: true, jobId: run.jobId, status: run.status });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error instanceof Error ? error.message : "Could not start the reparse" });
  }
});

/**
 * Runs an exploratory sweep now ("Run sweep" on /teach) instead of waiting for the weekly one.
 *
 * @example
 * POST /reinterpret/sweep -> 202 { "jobId": "exploratory-sweep-1731456000000" }
 */
reinterpretRouter.post("/sweep", async (_req, res) => {
  try {
    const container = await ServiceContainer.getInstance();
    const jobId = `exploratory-sweep-${Date.now()}`;
    const data: ReinterpretJobData = { jobId, runJobId: jobId, kind: "EXPLORATORY_SWEEP" };
    await container.queues.reinterpretQueue.add("exploratory-sweep", data, { jobId, removeOnComplete: 20, removeOnFail: 20 });
    res.status(HttpStatus.ACCEPTED).json({ success: true, jobId });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error instanceof Error ? error.message : "Could not start the sweep" });
  }
});

/**
 * Takes a corpus health snapshot now.
 *
 * @example
 * POST /reinterpret/snapshot -> 202 { "success": true }
 */
reinterpretRouter.post("/snapshot", async (_req, res) => {
  try {
    const container = await ServiceContainer.getInstance();
    await enqueueSnapshot(container.queues.reinterpretQueue, "MANUAL");
    res.status(HttpStatus.ACCEPTED).json({ success: true });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: error instanceof Error ? error.message : "Could not take a snapshot" });
  }
});

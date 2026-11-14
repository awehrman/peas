import {
  type UrlCheckOutcome,
  decideAutoMatch,
  getUrlCheckTarget,
  listPendingBookLookupIds,
  listUrlsDueForCheck,
  parseBookReference,
  rankBookCandidates,
  recordBookLookupError,
  recordBookLookupResult,
  recordUrlCheck,
  startBookLookup,
} from "@peas/database";

import { findBookCandidates } from "./open-library";
import { checkUrl } from "./url-check";

import type { StructuredLogger } from "../../types";

/** Job options for one URL check: network errors retry with backoff; the job id makes repeated requests for one URL collapse. */
export const URL_CHECK_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: 500,
  removeOnFail: 200,
};

export const BOOK_LOOKUP_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 10_000 },
  removeOnComplete: 500,
  removeOnFail: 200,
};

/** URLs not checked for this long are rechecked by the weekly sweep. */
export const URL_RECHECK_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
export const URL_RECHECK_BATCH = 500;
export const BOOK_LOOKUP_BATCH = 200;

export function urlCheckJobId(urlId: string): string {
  return `url-check-${urlId}`;
}

export function bookLookupJobId(lookupId: string): string {
  return `book-lookup-${lookupId}`;
}

/** A job on the source queue. */
export interface SourceJobData {
  kind: "CHECK_URL" | "RECHECK_STALE_URLS";
  urlId?: string;
  jobId?: string;
}

/** A job on the book lookup queue. */
export interface BookLookupJobData {
  kind: "LOOKUP_BOOK" | "LOOKUP_PENDING_BOOKS";
  lookupId?: string;
  jobId?: string;
}

export interface UrlCheckServices {
  check: (url: string) => Promise<UrlCheckOutcome>;
}

/**
 * Checks one stored URL and records the outcome. A network failure is recorded only on the last attempt, so a transient error does not flip a reachable URL to UNREACHABLE; BLOCKED and HTTP outcomes are final at once.
 *
 * @example
 * await runUrlCheck({ kind: "CHECK_URL", urlId }, logger, { attemptNumber: 1, maxAttempts: 3 })
 */
export async function runUrlCheck(
  data: SourceJobData,
  logger: StructuredLogger,
  attempt: { attemptNumber: number; maxAttempts: number },
  services: UrlCheckServices = { check: (url) => checkUrl(url) }
): Promise<SourceJobData> {
  if (!data.urlId) throw new Error("CHECK_URL needs a urlId");
  const target = await getUrlCheckTarget(data.urlId);
  if (!target) {
    logger.log(`[URL_CHECK] URL ${data.urlId} no longer exists; skipping`);
    return data;
  }

  const outcome = await services.check(target.originalUrl);
  const isNetworkFailure = outcome.status === "UNREACHABLE" && outcome.httpStatus === null;
  if (isNetworkFailure && attempt.attemptNumber < attempt.maxAttempts) {
    throw new Error(`URL check failed, will retry: ${outcome.failureReason}`);
  }

  await recordUrlCheck(target.id, outcome);
  logger.log(
    `[URL_CHECK] ${target.originalUrl}: ${outcome.status}${outcome.httpStatus ? ` (${outcome.httpStatus})` : ""}${outcome.failureReason ? ` ${outcome.failureReason}` : ""}`
  );
  return data;
}

/**
 * Enqueues checks for URLs never checked or not checked in 30 days, oldest first.
 *
 * @example
 * await recheckStaleUrls(logger, (urlId) => sourceQueue.add("check-url", ...)) // 120
 */
export async function recheckStaleUrls(
  logger: StructuredLogger,
  enqueue: (urlId: string) => Promise<void>,
  now: Date = new Date()
): Promise<number> {
  const urlIds = await listUrlsDueForCheck({
    checkedBefore: new Date(now.getTime() - URL_RECHECK_INTERVAL_MS),
    limit: URL_RECHECK_BATCH,
  });
  for (const urlId of urlIds) await enqueue(urlId);
  logger.log(`[URL_CHECK] queued ${urlIds.length} stale URL checks`);
  return urlIds.length;
}

export interface BookLookupServices {
  findCandidates: typeof findBookCandidates;
}

/**
 * Looks up one source text on Open Library, ranks the candidates, and either links the matched book or leaves the lookup for review. Provider errors mark the lookup ERROR and rethrow so the job retries; they never touch the import.
 *
 * @example
 * await runBookLookup({ kind: "LOOKUP_BOOK", lookupId }, logger) // AMBIGUOUS lookups appear on /import/books
 */
export async function runBookLookup(
  data: BookLookupJobData,
  logger: StructuredLogger,
  services: BookLookupServices = { findCandidates: findBookCandidates }
): Promise<BookLookupJobData> {
  if (!data.lookupId) throw new Error("LOOKUP_BOOK needs a lookupId");
  const lookup = await startBookLookup(data.lookupId);
  if (!lookup) {
    logger.log(`[BOOK_LOOKUP] ${data.lookupId} is already settled; skipping`);
    return data;
  }

  try {
    const reference = parseBookReference(lookup.query);
    const inputs = await services.findCandidates(reference);
    const ranked = rankBookCandidates(reference, inputs).slice(0, 10);
    const decision = decideAutoMatch(ranked);
    const { noteIds } = await recordBookLookupResult(lookup.id, ranked, decision);
    logger.log(
      `[BOOK_LOOKUP] "${lookup.query}": ${decision.status} with ${ranked.length} candidates${noteIds.length ? `, ${noteIds.length} notes linked` : ""}`
    );
    return data;
  } catch (error) {
    await recordBookLookupError(lookup.id, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Enqueues lookups still PENDING (titles backfilled from old imports, or ones whose job was lost).
 *
 * @example
 * await lookupPendingBooks(logger, (id) => bookLookupQueue.add(...)) // 34
 */
export async function lookupPendingBooks(
  logger: StructuredLogger,
  enqueue: (lookupId: string) => Promise<void>
): Promise<number> {
  const ids = await listPendingBookLookupIds(BOOK_LOOKUP_BATCH);
  for (const id of ids) await enqueue(id);
  logger.log(`[BOOK_LOOKUP] queued ${ids.length} pending lookups`);
  return ids.length;
}

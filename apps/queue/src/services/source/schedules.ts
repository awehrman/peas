import type { Queue } from "bullmq";

import type { StructuredLogger } from "../../types";
import type { BookLookupJobData, SourceJobData } from "./service";

/**
 * Repeating source maintenance: a weekly recheck of URLs not checked in 30 days, and a daily pass that queues book lookups still pending (backfilled titles, lost jobs). Times are server-local cron patterns.
 */
export const SOURCE_SCHEDULES = {
  recheck: {
    id: "url-recheck-weekly",
    pattern: "0 5 * * 1",
    name: "recheck-stale-urls",
    data: { kind: "RECHECK_STALE_URLS", jobId: "url-recheck-weekly" } satisfies SourceJobData,
  },
  pendingBooks: {
    id: "book-lookups-daily",
    pattern: "30 5 * * *",
    name: "lookup-pending-books",
    data: { kind: "LOOKUP_PENDING_BOOKS", jobId: "book-lookups-daily" } satisfies BookLookupJobData,
  },
} as const;

/**
 * Registers (or updates) the source schedules. Safe on every start: schedulers are keyed by id.
 *
 * @example
 * await scheduleSourceJobs(queues.sourceQueue, queues.bookLookupQueue, logger)
 */
export async function scheduleSourceJobs(
  sourceQueue: Pick<Queue, "upsertJobScheduler">,
  bookLookupQueue: Pick<Queue, "upsertJobScheduler">,
  logger: StructuredLogger
): Promise<void> {
  const { recheck, pendingBooks } = SOURCE_SCHEDULES;
  await sourceQueue.upsertJobScheduler(
    recheck.id,
    { pattern: recheck.pattern },
    { name: recheck.name, data: recheck.data, opts: { removeOnComplete: 20, removeOnFail: 20 } }
  );
  await bookLookupQueue.upsertJobScheduler(
    pendingBooks.id,
    { pattern: pendingBooks.pattern },
    { name: pendingBooks.name, data: pendingBooks.data, opts: { removeOnComplete: 20, removeOnFail: 20 } }
  );
  logger.log(
    `[SOURCES] scheduled ${recheck.id} (${recheck.pattern}), ${pendingBooks.id} (${pendingBooks.pattern})`
  );
}

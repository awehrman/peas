import type { Queue } from "bullmq";

import {
  BOOK_LOOKUP_JOB_OPTIONS,
  type BookLookupJobData,
  type SourceJobData,
  URL_CHECK_JOB_OPTIONS,
  bookLookupJobId,
  urlCheckJobId,
} from "./service";

/**
 * Queues a reachability check for one URL. The job id is per URL, so a URL cited by many notes is checked once at a time.
 *
 * @example
 * await enqueueUrlCheck(sourceQueue, "cm3u...") // job "url-check-cm3u..."
 */
export async function enqueueUrlCheck(queue: Pick<Queue, "add">, urlId: string): Promise<string> {
  const jobId = urlCheckJobId(urlId);
  const data: SourceJobData = { kind: "CHECK_URL", urlId, jobId };
  await queue.add("check-url", data, { jobId, ...URL_CHECK_JOB_OPTIONS });
  return jobId;
}

/**
 * Queues the bibliographic lookup for one source text. The job id is per lookup, so a cookbook cited by hundreds of notes is looked up once.
 *
 * @example
 * await enqueueBookLookup(bookLookupQueue, "0193...") // job "book-lookup-0193..."
 */
export async function enqueueBookLookup(queue: Pick<Queue, "add">, lookupId: string): Promise<string> {
  const jobId = bookLookupJobId(lookupId);
  const data: BookLookupJobData = { kind: "LOOKUP_BOOK", lookupId, jobId };
  await queue.add("lookup-book", data, { jobId, ...BOOK_LOOKUP_JOB_OPTIONS });
  return jobId;
}

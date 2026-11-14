import { describe, expect, it, vi } from "vitest";

import { enqueueBookLookup, enqueueUrlCheck } from "../../source/enqueue";
import { SOURCE_SCHEDULES, scheduleSourceJobs } from "../../source/schedules";

describe("scheduleSourceJobs", () => {
  it("registers the weekly URL recheck and the daily pending-lookup pass by id", async () => {
    const sourceQueue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };
    const bookLookupQueue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };
    const logger = { log: vi.fn() };

    await scheduleSourceJobs(sourceQueue as never, bookLookupQueue as never, logger);

    expect(sourceQueue.upsertJobScheduler).toHaveBeenCalledWith(
      "url-recheck-weekly",
      { pattern: SOURCE_SCHEDULES.recheck.pattern },
      expect.objectContaining({ name: "recheck-stale-urls", data: { kind: "RECHECK_STALE_URLS", jobId: "url-recheck-weekly" } })
    );
    expect(bookLookupQueue.upsertJobScheduler).toHaveBeenCalledWith(
      "book-lookups-daily",
      { pattern: SOURCE_SCHEDULES.pendingBooks.pattern },
      expect.objectContaining({ data: { kind: "LOOKUP_PENDING_BOOKS", jobId: "book-lookups-daily" } })
    );
  });
});

describe("enqueue helpers", () => {
  it("key jobs by URL and by lookup so repeated requests collapse", async () => {
    const queue = { add: vi.fn().mockResolvedValue(undefined) };
    await expect(enqueueUrlCheck(queue as never, "u1")).resolves.toBe("url-check-u1");
    await expect(enqueueBookLookup(queue as never, "l1")).resolves.toBe("book-lookup-l1");
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      "check-url",
      { kind: "CHECK_URL", urlId: "u1", jobId: "url-check-u1" },
      expect.objectContaining({ jobId: "url-check-u1", attempts: 3 })
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      "lookup-book",
      { kind: "LOOKUP_BOOK", lookupId: "l1", jobId: "book-lookup-l1" },
      expect.objectContaining({ jobId: "book-lookup-l1" })
    );
  });
});

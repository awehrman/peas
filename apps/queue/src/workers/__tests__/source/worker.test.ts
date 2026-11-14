import { describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import { BookLookupWorker, SourceWorker } from "../../source/worker";

function container() {
  return {
    logger: { log: vi.fn() },
    queues: { sourceQueue: { add: vi.fn() }, bookLookupQueue: { add: vi.fn() } },
  } as never;
}

const queue = { name: "source" } as never;
const context = {
  jobId: "j1",
  retryCount: 0,
  queueName: "source",
  operation: "source",
  startTime: 0,
  workerName: "source",
  attemptNumber: 1,
};

describe("SourceWorker", () => {
  it("routes checks and scheduled rechecks to their actions, with a rate limit", () => {
    const worker = new SourceWorker(queue, container());
    const internals = worker as unknown as {
      createActionPipeline: (data: unknown, ctx: unknown) => { name: ActionName }[];
      getRateLimit: () => { max: number; duration: number };
      getConcurrency: () => number;
    };
    expect(internals.createActionPipeline({ kind: "CHECK_URL", urlId: "u1" }, context).map((a) => a.name)).toEqual([
      ActionName.CHECK_URL,
    ]);
    expect(internals.createActionPipeline({ kind: "RECHECK_STALE_URLS" }, context).map((a) => a.name)).toEqual([
      ActionName.RECHECK_STALE_URLS,
    ]);
    expect(internals.getRateLimit()).toEqual({ max: 5, duration: 1000 });
    expect(internals.getConcurrency()).toBe(4);
  });
});

describe("BookLookupWorker", () => {
  it("runs one lookup at a time, at most one request per second", () => {
    const worker = new BookLookupWorker(queue, container());
    const internals = worker as unknown as {
      createActionPipeline: (data: unknown, ctx: unknown) => { name: ActionName }[];
      getRateLimit: () => { max: number; duration: number };
      getConcurrency: () => number;
    };
    expect(internals.createActionPipeline({ kind: "LOOKUP_BOOK", lookupId: "l1" }, context).map((a) => a.name)).toEqual([
      ActionName.LOOKUP_BOOK,
    ]);
    expect(internals.createActionPipeline({ kind: "LOOKUP_PENDING_BOOKS" }, context).map((a) => a.name)).toEqual([
      ActionName.LOOKUP_PENDING_BOOKS,
    ]);
    expect(internals.getRateLimit()).toEqual({ max: 1, duration: 1000 });
    expect(internals.getConcurrency()).toBe(1);
  });
});

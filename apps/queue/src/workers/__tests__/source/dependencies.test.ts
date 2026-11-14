import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  runUrlCheck: vi.fn(async (data: unknown) => data),
  recheckStaleUrls: vi.fn(async (_logger: unknown, enqueue: (id: string) => Promise<void>) => {
    await enqueue("u1");
    return 1;
  }),
  runBookLookup: vi.fn(async (data: unknown) => data),
  lookupPendingBooks: vi.fn(async (_logger: unknown, enqueue: (id: string) => Promise<void>) => {
    await enqueue("l1");
    return 1;
  }),
  URL_CHECK_JOB_OPTIONS: { attempts: 3 },
}));
vi.mock("../../../services/source/service", () => service);

const enqueue = vi.hoisted(() => ({
  enqueueUrlCheck: vi.fn(async () => "url-check-u1"),
  enqueueBookLookup: vi.fn(async () => "book-lookup-l1"),
}));
vi.mock("../../../services/source/enqueue", () => enqueue);

import {
  CheckUrlAction,
  LookupBookAction,
  LookupPendingBooksAction,
  RecheckStaleUrlsAction,
  registerBookLookupActions,
  registerSourceActions,
} from "../../../services/source/actions";
import { ActionFactory } from "../../core/action-factory";
import {
  buildBookLookupDependencies,
  buildSourceDependencies,
} from "../../source/dependencies";
import { createBookLookupWorker, createSourceWorker } from "../../source/worker";

const sourceQueue = { add: vi.fn(), name: "source" };
const bookLookupQueue = { add: vi.fn(), name: "book-lookup" };
const container = {
  logger: { log: vi.fn() },
  queues: { sourceQueue, bookLookupQueue },
} as never;

const context = {
  jobId: "j",
  retryCount: 0,
  queueName: "source",
  operation: "source",
  startTime: 0,
  workerName: "source",
  attemptNumber: 2,
};

describe("source worker dependencies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs URL checks with the attempt number and the job's retry budget", async () => {
    const deps = buildSourceDependencies(container);
    await deps.services.checkUrl({ kind: "CHECK_URL", urlId: "u1" }, 2);
    expect(service.runUrlCheck).toHaveBeenCalledWith(
      { kind: "CHECK_URL", urlId: "u1" },
      expect.anything(),
      { attemptNumber: 2, maxAttempts: 3 }
    );

    await deps.services.recheckStaleUrls({ kind: "RECHECK_STALE_URLS" });
    expect(enqueue.enqueueUrlCheck).toHaveBeenCalledWith(sourceQueue, "u1");
  });

  it("runs book lookups and queues pending ones on the lookup queue", async () => {
    const deps = buildBookLookupDependencies(container);
    await deps.services.lookupBook({ kind: "LOOKUP_BOOK", lookupId: "l1" });
    expect(service.runBookLookup).toHaveBeenCalled();

    await deps.services.lookupPendingBooks({ kind: "LOOKUP_PENDING_BOOKS" });
    expect(enqueue.enqueueBookLookup).toHaveBeenCalledWith(bookLookupQueue, "l1");
  });
});

describe("source actions", () => {
  it("delegate to their services", async () => {
    const services = {
      checkUrl: vi.fn(async (data) => data),
      recheckStaleUrls: vi.fn(async (data) => data),
      lookupBook: vi.fn(async (data) => data),
      lookupPendingBooks: vi.fn(async (data) => data),
    };
    const deps = { logger: { log: vi.fn() }, services } as never;

    await new CheckUrlAction().execute({ kind: "CHECK_URL", urlId: "u1" }, deps, context);
    expect(services.checkUrl).toHaveBeenCalledWith({ kind: "CHECK_URL", urlId: "u1" }, 2);
    await new RecheckStaleUrlsAction().execute({ kind: "RECHECK_STALE_URLS" }, deps, context);
    await new LookupBookAction().execute({ kind: "LOOKUP_BOOK", lookupId: "l1" }, deps, context);
    await new LookupPendingBooksAction().execute({ kind: "LOOKUP_PENDING_BOOKS" }, deps, context);
    expect(services.recheckStaleUrls).toHaveBeenCalled();
    expect(services.lookupBook).toHaveBeenCalled();
    expect(services.lookupPendingBooks).toHaveBeenCalled();
  });

  it("register under their action names", () => {
    const sourceFactory = new ActionFactory();
    const lookupFactory = new ActionFactory();
    registerSourceActions(sourceFactory as never);
    registerBookLookupActions(lookupFactory as never);
    expect(sourceFactory.getRegisteredActions()).toEqual(["check_url", "recheck_stale_urls"]);
    expect(lookupFactory.getRegisteredActions()).toEqual(["lookup_book", "lookup_pending_books"]);
  });
});

describe("source worker factories", () => {
  it("name their operations", () => {
    const sourceWorker = createSourceWorker(sourceQueue as never, container);
    const lookupWorker = createBookLookupWorker(bookLookupQueue as never, container);
    expect((sourceWorker as unknown as { getOperationName(): string }).getOperationName()).toBe("source");
    expect((lookupWorker as unknown as { getOperationName(): string }).getOperationName()).toBe("book_lookup");
  });
});

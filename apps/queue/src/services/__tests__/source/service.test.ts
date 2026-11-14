import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@peas/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@peas/database")>();
  return {
    // The pure matching helpers run for real; only database access is mocked
    parseBookReference: actual.parseBookReference,
    rankBookCandidates: actual.rankBookCandidates,
    decideAutoMatch: actual.decideAutoMatch,
    getUrlCheckTarget: vi.fn(),
    recordUrlCheck: vi.fn(),
    listUrlsDueForCheck: vi.fn(),
    startBookLookup: vi.fn(),
    recordBookLookupResult: vi.fn(),
    recordBookLookupError: vi.fn(),
    listPendingBookLookupIds: vi.fn(),
  };
});

const defaults = vi.hoisted(() => ({
  checkUrl: vi.fn(async () => ({
    status: "REACHABLE" as const,
    httpStatus: 200,
    finalUrl: null,
    canonicalUrl: null,
    failureReason: null,
  })),
  findBookCandidates: vi.fn(async () => []),
}));
vi.mock("../../source/url-check", () => ({ checkUrl: defaults.checkUrl }));
vi.mock("../../source/open-library", () => ({ findBookCandidates: defaults.findBookCandidates }));

import {
  getUrlCheckTarget,
  listPendingBookLookupIds,
  listUrlsDueForCheck,
  recordBookLookupError,
  recordBookLookupResult,
  recordUrlCheck,
  startBookLookup,
} from "@peas/database";

import {
  URL_RECHECK_INTERVAL_MS,
  lookupPendingBooks,
  recheckStaleUrls,
  runBookLookup,
  runUrlCheck,
} from "../../source/service";
import type { BookCandidateInput } from "@peas/database";

const logger = { log: vi.fn() };

const target = {
  id: "u1",
  sourceId: "s1",
  originalUrl: "https://example.com/chili",
  normalizedUrl: "https://example.com/chili",
  lastCheckedAt: null,
};

describe("runUrlCheck", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records the outcome of a check", async () => {
    vi.mocked(getUrlCheckTarget).mockResolvedValue(target);
    vi.mocked(recordUrlCheck).mockResolvedValue({ noteIds: ["n1"] });
    const check = vi.fn().mockResolvedValue({
      status: "REACHABLE",
      httpStatus: 200,
      finalUrl: target.originalUrl,
      canonicalUrl: null,
      failureReason: null,
    });

    await runUrlCheck({ kind: "CHECK_URL", urlId: "u1" }, logger, { attemptNumber: 1, maxAttempts: 3 }, { check });

    expect(check).toHaveBeenCalledWith("https://example.com/chili");
    expect(recordUrlCheck).toHaveBeenCalledWith("u1", expect.objectContaining({ status: "REACHABLE", httpStatus: 200 }));
  });

  it("retries a network failure before recording it, so a blip never marks a URL unreachable", async () => {
    vi.mocked(getUrlCheckTarget).mockResolvedValue(target);
    const check = vi.fn().mockResolvedValue({
      status: "UNREACHABLE",
      httpStatus: null,
      finalUrl: target.originalUrl,
      canonicalUrl: null,
      failureReason: "Timed out",
    });

    await expect(
      runUrlCheck({ kind: "CHECK_URL", urlId: "u1" }, logger, { attemptNumber: 1, maxAttempts: 3 }, { check })
    ).rejects.toThrow("will retry");
    expect(recordUrlCheck).not.toHaveBeenCalled();

    await runUrlCheck({ kind: "CHECK_URL", urlId: "u1" }, logger, { attemptNumber: 3, maxAttempts: 3 }, { check });
    expect(recordUrlCheck).toHaveBeenCalledWith("u1", expect.objectContaining({ status: "UNREACHABLE" }));
  });

  it("records HTTP errors and blocked targets on the first attempt", async () => {
    vi.mocked(getUrlCheckTarget).mockResolvedValue(target);
    const check = vi.fn().mockResolvedValue({
      status: "UNREACHABLE",
      httpStatus: 404,
      finalUrl: target.originalUrl,
      canonicalUrl: null,
      failureReason: "HTTP 404",
    });
    await runUrlCheck({ kind: "CHECK_URL", urlId: "u1" }, logger, { attemptNumber: 1, maxAttempts: 3 }, { check });
    expect(recordUrlCheck).toHaveBeenCalledTimes(1);
  });

  it("skips URLs that no longer exist", async () => {
    vi.mocked(getUrlCheckTarget).mockResolvedValue(null);
    const check = vi.fn();
    await runUrlCheck({ kind: "CHECK_URL", urlId: "gone" }, logger, { attemptNumber: 1, maxAttempts: 3 }, { check });
    expect(check).not.toHaveBeenCalled();
  });
});

describe("recheckStaleUrls", () => {
  it("queues URLs not checked within the interval", async () => {
    vi.mocked(listUrlsDueForCheck).mockResolvedValue(["u1", "u2"]);
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const now = new Date("2026-11-13T00:00:00.000Z");

    await expect(recheckStaleUrls(logger, enqueue, now)).resolves.toBe(2);
    expect(listUrlsDueForCheck).toHaveBeenCalledWith({
      checkedBefore: new Date(now.getTime() - URL_RECHECK_INTERVAL_MS),
      limit: 500,
    });
    expect(enqueue).toHaveBeenNthCalledWith(2, "u2");
  });
});

function doc(overrides: Partial<BookCandidateInput>): BookCandidateInput {
  return {
    workKey: "/works/OL1W",
    title: "Salt, Fat, Acid, Heat",
    subtitle: "Mastering the Elements of Good Cooking",
    authors: ["Samin Nosrat"],
    firstPublishYear: 2017,
    publishers: ["Simon & Schuster"],
    editionCount: 12,
    coverId: 1,
    isbns: ["9781476753836"],
    editionKey: null,
    matchedIsbn: null,
    ...overrides,
  };
}

describe("runBookLookup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matches automatically when the title and author agree", async () => {
    vi.mocked(startBookLookup).mockResolvedValue({ id: "l1", query: "Salt, Fat, Acid, Heat by Samin Nosrat p. 112", queryKey: "k" });
    vi.mocked(recordBookLookupResult).mockResolvedValue({ noteIds: ["n1", "n2"] });
    const findCandidates = vi.fn().mockResolvedValue([doc({}), doc({ workKey: "/works/OL2W", authors: ["Someone"], title: "Salt" })]);

    await runBookLookup({ kind: "LOOKUP_BOOK", lookupId: "l1" }, logger, { findCandidates });

    expect(findCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Salt, Fat, Acid, Heat", author: "Samin Nosrat" })
    );
    const [, ranked, decision] = vi.mocked(recordBookLookupResult).mock.calls[0]!;
    expect(ranked[0]?.workKey).toBe("/works/OL1W");
    expect(decision).toMatchObject({ status: "MATCHED", reason: "Exact title and author" });
  });

  it("leaves ambiguous titles for review instead of taking the first result", async () => {
    vi.mocked(startBookLookup).mockResolvedValue({ id: "l2", query: "Joy of Cooking", queryKey: "k" });
    vi.mocked(recordBookLookupResult).mockResolvedValue({ noteIds: [] });
    const findCandidates = vi.fn().mockResolvedValue([
      doc({ workKey: "/works/A", title: "Joy of Cooking", authors: ["Irma Rombauer"], editionCount: 80 }),
      doc({ workKey: "/works/B", title: "The Joy of Cooking", authors: ["Irma S. Rombauer"], editionCount: 30 }),
    ]);

    await runBookLookup({ kind: "LOOKUP_BOOK", lookupId: "l2" }, logger, { findCandidates });
    expect(vi.mocked(recordBookLookupResult).mock.calls[0]?.[2]).toEqual({ status: "AMBIGUOUS" });
  });

  it("marks provider failures as ERROR and rethrows so the job retries", async () => {
    vi.mocked(startBookLookup).mockResolvedValue({ id: "l3", query: "Anything", queryKey: "k" });
    const findCandidates = vi.fn().mockRejectedValue(new Error("Open Library answered 503"));

    await expect(runBookLookup({ kind: "LOOKUP_BOOK", lookupId: "l3" }, logger, { findCandidates })).rejects.toThrow("503");
    expect(recordBookLookupError).toHaveBeenCalledWith("l3", "Open Library answered 503");
  });

  it("does nothing for a lookup that is already settled (a duplicate job)", async () => {
    vi.mocked(startBookLookup).mockResolvedValue(null);
    const findCandidates = vi.fn();
    await runBookLookup({ kind: "LOOKUP_BOOK", lookupId: "l4" }, logger, { findCandidates });
    expect(findCandidates).not.toHaveBeenCalled();
  });
});

describe("job data validation", () => {
  it("requires the ids each job works on", async () => {
    await expect(
      runUrlCheck({ kind: "CHECK_URL" }, logger, { attemptNumber: 1, maxAttempts: 3 }, { check: vi.fn() })
    ).rejects.toThrow("urlId");
    await expect(runBookLookup({ kind: "LOOKUP_BOOK" }, logger, { findCandidates: vi.fn() })).rejects.toThrow("lookupId");
  });

  it("records non-Error provider failures as text", async () => {
    vi.mocked(startBookLookup).mockResolvedValue({ id: "l5", query: "x", queryKey: "x" });
    await expect(
      runBookLookup({ kind: "LOOKUP_BOOK", lookupId: "l5" }, logger, { findCandidates: vi.fn().mockRejectedValue("offline") })
    ).rejects.toBe("offline");
    expect(recordBookLookupError).toHaveBeenCalledWith("l5", "offline");
  });
});

describe("production defaults", () => {
  it("use the real checker, provider, and clock", async () => {
    vi.mocked(getUrlCheckTarget).mockResolvedValue(target);
    vi.mocked(recordUrlCheck).mockResolvedValue({ noteIds: [] });
    await runUrlCheck({ kind: "CHECK_URL", urlId: "u1" }, logger, { attemptNumber: 1, maxAttempts: 3 });
    expect(defaults.checkUrl).toHaveBeenCalledWith(target.originalUrl);

    vi.mocked(startBookLookup).mockResolvedValue({ id: "l6", query: "Plenty", queryKey: "plenty" });
    vi.mocked(recordBookLookupResult).mockResolvedValue({ noteIds: [] });
    await runBookLookup({ kind: "LOOKUP_BOOK", lookupId: "l6" }, logger);
    expect(defaults.findBookCandidates).toHaveBeenCalled();

    vi.mocked(listUrlsDueForCheck).mockResolvedValue([]);
    await expect(recheckStaleUrls(logger, vi.fn())).resolves.toBe(0);
  });
});

describe("lookupPendingBooks", () => {
  it("queues every pending lookup", async () => {
    vi.mocked(listPendingBookLookupIds).mockResolvedValue(["l1", "l2", "l3"]);
    const enqueue = vi.fn().mockResolvedValue(undefined);
    await expect(lookupPendingBooks(logger, enqueue)).resolves.toBe(3);
    expect(enqueue).toHaveBeenCalledTimes(3);
  });
});

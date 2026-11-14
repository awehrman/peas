import { describe, expect, it } from "vitest";

import { type RankableSource, choosePrimarySource, isInactiveSource, sourceRank } from "../source-preference.js";

const source = (sourceId: string, overrides: Partial<RankableSource>): RankableSource => ({
  sourceId,
  kind: "OTHER",
  bookMatchStatus: null,
  urlCheckStatus: null,
  ...overrides,
});

const matchedBook = source("book", { kind: "BOOK", bookMatchStatus: "CONFIRMED" });
const unmatchedBook = source("legacy-book", { kind: "BOOK", bookMatchStatus: "UNMATCHED" });
const reachable = source("url-ok", { kind: "URL", urlCheckStatus: "REACHABLE" });
const unchecked = source("url-new", { kind: "URL", urlCheckStatus: "UNCHECKED" });
const broken = source("url-404", { kind: "URL", urlCheckStatus: "UNREACHABLE" });
const blocked = source("url-local", { kind: "URL", urlCheckStatus: "BLOCKED" });
const text = source("text", {});

describe("choosePrimarySource", () => {
  it("prefers a book over a URL", () => {
    expect(choosePrimarySource([reachable, matchedBook], reachable.sourceId)).toBe("book");
    expect(choosePrimarySource([reachable, unmatchedBook], reachable.sourceId)).toBe("legacy-book");
  });

  it("orders URLs by their last check and never makes a failed one primary over a working one", () => {
    expect(choosePrimarySource([broken, unchecked], broken.sourceId)).toBe("url-new");
    expect(choosePrimarySource([unchecked, reachable], null)).toBe("url-ok");
    expect(choosePrimarySource([blocked, text], null)).toBe("url-local");
  });

  it("keeps the current primary on a tie", () => {
    const second = source("url-ok-2", { kind: "URL", urlCheckStatus: "REACHABLE" });
    expect(choosePrimarySource([reachable, second], "url-ok-2")).toBe("url-ok-2");
    expect(choosePrimarySource([reachable, second], null)).toBe("url-ok");
  });

  it("returns null without sources", () => {
    expect(choosePrimarySource([], null)).toBeNull();
  });
});

describe("sourceRank and isInactiveSource", () => {
  it("ranks every kind", () => {
    expect([matchedBook, unmatchedBook, reachable, unchecked, broken, text].map(sourceRank)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("flags failed and blocked URLs as inactive", () => {
    expect([broken, blocked, reachable, matchedBook].map(isInactiveSource)).toEqual([true, true, false, false]);
  });
});

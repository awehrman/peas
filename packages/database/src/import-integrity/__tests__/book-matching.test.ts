import { describe, expect, it } from "vitest";

import {
  type BookCandidateInput,
  decideAutoMatch,
  parseBookReference,
  rankBookCandidates,
  titleKey,
} from "../book-matching.js";
import { extractIsbns, isValidIsbn10, isValidIsbn13, isbn10To13 } from "../isbn.js";

describe("ISBNs", () => {
  it("validates checksums", () => {
    expect(isValidIsbn10("0743246268")).toBe(true);
    expect(isValidIsbn10("0743246269")).toBe(false);
    expect(isValidIsbn10("080442957X")).toBe(true);
    expect(isValidIsbn13("9780743246262")).toBe(true);
    expect(isValidIsbn13("9780743246263")).toBe(false);
  });

  it("converts ISBN-10 to ISBN-13", () => {
    expect(isbn10To13("0743246268")).toBe("9780743246262");
  });

  it("finds ISBNs written with hyphens or spaces and ignores look-alike numbers", () => {
    expect(extractIsbns("Joy of Cooking, ISBN 0-7432-4626-8, p. 12")).toEqual([
      { isbn13: "9780743246262", isbn10: "0743246268" },
    ]);
    expect(extractIsbns("978 0 7432 4626 2")).toEqual([{ isbn13: "9780743246262", isbn10: null }]);
    expect(extractIsbns("call 555-123-4567")).toEqual([]);
  });
});

describe("parseBookReference", () => {
  it("splits title, author, and page references", () => {
    expect(parseBookReference("Salt, Fat, Acid, Heat by Samin Nosrat p. 112")).toMatchObject({
      title: "Salt, Fat, Acid, Heat",
      subtitle: null,
      author: "Samin Nosrat",
      isbns: [],
    });
    expect(parseBookReference("Plenty - Yotam Ottolenghi, pages 40-41")).toMatchObject({
      title: "Plenty",
      author: "Yotam Ottolenghi",
    });
    expect(parseBookReference("Salt, Fat, Acid, Heat: Mastering the Elements (2017)")).toMatchObject({
      title: "Salt, Fat, Acid, Heat",
      subtitle: "Mastering the Elements",
      author: null,
    });
  });

  it("keeps ISBNs out of the title", () => {
    const reference = parseBookReference("The Joy of Cooking ISBN 978-0-7432-4626-2");
    expect(reference.title).toBe("The Joy of Cooking");
    expect(reference.isbns).toEqual([{ isbn13: "9780743246262", isbn10: null }]);
  });
});

describe("titleKey", () => {
  it("ignores leading articles, case, punctuation, and accents", () => {
    expect(titleKey("The Joy of Cooking")).toBe(titleKey("joy of cooking!"));
    expect(titleKey("Crème Fraîche Everyday")).toBe("creme fraiche everyday");
  });
});

function candidate(overrides: Partial<BookCandidateInput>): BookCandidateInput {
  return {
    workKey: "/works/W",
    title: "Joy of Cooking",
    subtitle: null,
    authors: ["Irma S. Rombauer"],
    firstPublishYear: 1931,
    publishers: [],
    editionCount: 10,
    coverId: null,
    isbns: [],
    editionKey: null,
    matchedIsbn: null,
    ...overrides,
  };
}

describe("rankBookCandidates and decideAutoMatch", () => {
  it("matches an exact title with a matching author", () => {
    const ranked = rankBookCandidates(parseBookReference("Joy of Cooking by Rombauer"), [
      candidate({ workKey: "/works/other", title: "Joy of Baking", authors: ["Someone"] }),
      candidate({}),
    ]);
    expect(ranked[0]?.workKey).toBe("/works/W");
    expect(ranked[0]?.evidence).toContain("Title matches exactly");
    expect(decideAutoMatch(ranked)).toMatchObject({ status: "MATCHED", reason: "Exact title and author" });
  });

  it("never auto-matches two works with the same title", () => {
    const ranked = rankBookCandidates(parseBookReference("The Joy of Cooking"), [
      candidate({ workKey: "/works/A" }),
      candidate({ workKey: "/works/B", authors: ["Another Author"], editionCount: 2 }),
    ]);
    expect(decideAutoMatch(ranked)).toEqual({ status: "AMBIGUOUS" });
  });

  it("accepts the only exact title when it leads clearly", () => {
    const ranked = rankBookCandidates(parseBookReference("Plenty"), [
      candidate({ workKey: "/works/plenty", title: "Plenty", authors: ["Yotam Ottolenghi"] }),
      candidate({ workKey: "/works/more", title: "Plenty More Vegetables Today", authors: ["Yotam Ottolenghi"] }),
    ]);
    expect(decideAutoMatch(ranked)).toMatchObject({ status: "MATCHED", candidate: { workKey: "/works/plenty" } });
  });

  it("penalizes a stated author that matches nobody", () => {
    const ranked = rankBookCandidates(parseBookReference("Joy of Cooking by Julia Child"), [candidate({})]);
    expect(ranked[0]?.signals.authorMatch).toBe(false);
    expect(ranked[0]?.evidence).toContain("Stated author does not match");
    expect(decideAutoMatch(ranked)).toEqual({ status: "AMBIGUOUS" });
  });

  it("matches on ISBN even when the title differs", () => {
    const ranked = rankBookCandidates(parseBookReference("JoC 75th, ISBN 0743246268"), [
      candidate({ isbns: ["9780743246262"] }),
    ]);
    expect(ranked[0]).toMatchObject({ matchedIsbn: "9780743246262", score: expect.any(Number) });
    expect(decideAutoMatch(ranked)).toMatchObject({ status: "MATCHED", reason: "ISBN match" });
  });

  it("reports no match for nothing or weak overlap", () => {
    expect(decideAutoMatch([])).toEqual({ status: "NO_MATCH" });
    const weak = rankBookCandidates(parseBookReference("Grandma's binder"), [candidate({ title: "Binders of Industry" })]);
    expect(decideAutoMatch(weak)).toEqual({ status: "NO_MATCH" });
  });
});

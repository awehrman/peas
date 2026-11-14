import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../client.js";
import type { BookCandidate } from "../../import-integrity/schemas.js";
import {
  createBookManually,
  getBookLookup,
  leaveBookUnresolved,
  recordBookLookupResult,
  selectBookCandidate,
} from "../book-lookup.js";
import { createNote, hasTestDatabase, resetDatabase } from "../ontology/__tests__/int-helpers.js";
import { attachImportedSource, getNoteSources, recordUrlCheck } from "../source.js";

function candidate(overrides: Partial<BookCandidate> = {}): BookCandidate {
  return {
    workKey: "/works/OL17801197W",
    title: "Salt, Fat, Acid, Heat",
    subtitle: null,
    authors: ["Samin Nosrat"],
    firstPublishYear: 2017,
    publishers: ["Simon & Schuster"],
    editionCount: 12,
    coverId: null,
    isbns: ["9781476753836"],
    matchedIsbn: null,
    editionKey: null,
    score: 0.9,
    signals: { titleExact: true, authorMatch: true, authorConflict: false, isbnMatch: false },
    evidence: ["Title matches exactly"],
    ...overrides,
  };
}

describe.skipIf(!hasTestDatabase)("structured sources", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reuses one URL source for URLs that normalize alike and keeps each original string", async () => {
    const first = await createNote("Chili");
    const second = await createNote("Chili again");

    const a = await attachImportedSource(first, "https://Example.com/chili?utm_source=rss");
    const b = await attachImportedSource(second, "https://example.com/chili#comments");

    expect(a?.sourceId).toBe(b?.sourceId);
    expect(a?.urlIdToCheck).toBeTruthy();
    const [link] = await getNoteSources(second);
    expect(link).toMatchObject({
      isPrimary: true,
      originalText: "https://example.com/chili#comments",
      source: { kind: "URL", url: { normalizedUrl: "https://example.com/chili", checkStatus: "UNCHECKED" } },
    });
  });

  it("skips the URL check when the URL was checked recently, and moves only lastSuccessfulVisitAt on success", async () => {
    const noteId = await createNote("Soup");
    const attached = await attachImportedSource(noteId, "https://example.com/soup");
    await recordUrlCheck(attached!.urlIdToCheck!, {
      status: "UNREACHABLE",
      httpStatus: 503,
      finalUrl: null,
      canonicalUrl: null,
      failureReason: "HTTP 503",
    });
    let url = await prisma.uRL.findUniqueOrThrow({ where: { id: attached!.urlIdToCheck! } });
    expect(url).toMatchObject({ checkStatus: "UNREACHABLE", consecutiveFailures: 1, lastSuccessfulVisitAt: null });

    await recordUrlCheck(url.id, {
      status: "REACHABLE",
      httpStatus: 200,
      finalUrl: "https://example.com/soup",
      canonicalUrl: null,
      failureReason: null,
    });
    url = await prisma.uRL.findUniqueOrThrow({ where: { id: url.id } });
    expect(url).toMatchObject({ checkStatus: "REACHABLE", consecutiveFailures: 0, lastFailureReason: null });
    expect(url.lastSuccessfulVisitAt).not.toBeNull();

    const again = await attachImportedSource(await createNote("Soup 2"), "https://example.com/soup");
    expect(again?.urlIdToCheck).toBeNull();
  });

  it("shares one book lookup between notes citing the same text", async () => {
    const first = await attachImportedSource(await createNote("A"), "Salt, Fat, Acid, Heat p. 12");
    const second = await attachImportedSource(await createNote("B"), "salt fat acid heat p 12");

    expect(first?.bookLookupIdToRun).toBeTruthy();
    expect(second?.sourceId).toBe(first?.sourceId);
    expect(second?.bookLookupIdToRun).toBe(first?.bookLookupIdToRun);
    expect(await prisma.bookLookup.count()).toBe(1);
  });

  it("links every citing note to the book on an automatic match, and later notes go straight to it", async () => {
    const noteA = await createNote("A");
    const noteB = await createNote("B");
    const attached = await attachImportedSource(noteA, "Salt, Fat, Acid, Heat");
    await attachImportedSource(noteB, "Salt, Fat, Acid, Heat");

    const { noteIds } = await recordBookLookupResult(attached!.bookLookupIdToRun!, [candidate()], {
      status: "MATCHED",
      candidate: candidate(),
      reason: "Exact title and author",
    });
    expect(noteIds.sort()).toEqual([noteA, noteB].sort());

    const [link] = await getNoteSources(noteA);
    expect(link?.source).toMatchObject({
      kind: "BOOK",
      book: {
        title: "Salt, Fat, Acid, Heat",
        authors: ["Samin Nosrat"],
        matchStatus: "AUTO_MATCHED",
        openLibraryWorkKey: "/works/OL17801197W",
        // The work's ISBN list is never copied without edition evidence
        isbn13: null,
      },
    });

    const later = await attachImportedSource(await createNote("C"), "salt, fat, acid, heat");
    expect(later).toMatchObject({ kind: "BOOK", sourceId: link?.source.id, bookLookupIdToRun: null });
  });

  it("merges two titles that resolve to the same work into one book source", async () => {
    const noteA = await createNote("A");
    const noteB = await createNote("B");
    const a = await attachImportedSource(noteA, "Salt Fat Acid Heat");
    const b = await attachImportedSource(noteB, "SFAH by Samin Nosrat");

    await recordBookLookupResult(a!.bookLookupIdToRun!, [candidate()], { status: "MATCHED", candidate: candidate(), reason: "x" });
    await recordBookLookupResult(b!.bookLookupIdToRun!, [candidate()], { status: "AMBIGUOUS" });
    await selectBookCandidate(b!.bookLookupIdToRun!, "/works/OL17801197W");
    await expect(selectBookCandidate(b!.bookLookupIdToRun!, "/works/unknown")).rejects.toThrow(
      "not part of this lookup"
    );

    const [sourceA] = await getNoteSources(noteA);
    const [sourceB] = await getNoteSources(noteB);
    expect(sourceA?.source.id).toBe(sourceB?.source.id);
    expect(await prisma.book.count()).toBe(1);
    expect(sourceB?.originalText).toBe("SFAH by Samin Nosrat");
  });

  it("stores ISBN and edition only when an ISBN identified the edition", async () => {
    const noteId = await createNote("A");
    const attached = await attachImportedSource(noteId, "Salt Fat Acid Heat ISBN 9781476753836");
    const isbnCandidate = candidate({ matchedIsbn: "9781476753836", editionKey: "/books/OL1M" });
    await recordBookLookupResult(attached!.bookLookupIdToRun!, [isbnCandidate], {
      status: "MATCHED",
      candidate: isbnCandidate,
      reason: "ISBN match",
    });
    expect(await prisma.book.findFirstOrThrow()).toMatchObject({
      isbn13: "9781476753836",
      openLibraryEditionKey: "/books/OL1M",
    });
  });

  it("supports manual books and leaving text unresolved", async () => {
    const noteId = await createNote("A");
    const attached = await attachImportedSource(noteId, "Grandma's binder");
    const lookupId = attached!.bookLookupIdToRun!;

    await leaveBookUnresolved(lookupId);
    expect((await getBookLookup(lookupId))?.status).toBe("LEFT_UNRESOLVED");
    expect((await getNoteSources(noteId))[0]?.source.kind).toBe("OTHER");

    await createBookManually(lookupId, {
      title: "Grandma's Binder",
      subtitle: null,
      authors: ["Ruth"],
      publisher: null,
      publishedYear: 1974,
      isbn13: null,
      isbn10: null,
    });
    const [link] = await getNoteSources(noteId);
    expect(link?.source).toMatchObject({ kind: "BOOK", book: { title: "Grandma's Binder", matchStatus: "MANUAL" } });
  });

  it("enriches a legacy unmatched book in place, keeping its source and links", async () => {
    const noteId = await createNote("Legacy");
    const book = await prisma.book.create({ data: { title: "Salt, Fat, Acid, Heat", originalTitle: "Salt, Fat, Acid, Heat" } });
    const source = await prisma.source.create({ data: { kind: "BOOK", bookId: book.id, canonicalKey: `book:${book.id}` } });
    await prisma.noteSource.create({ data: { noteId, sourceId: source.id, isPrimary: true } });
    const lookup = await prisma.bookLookup.create({
      data: { queryKey: "salt fat acid heat", query: "Salt, Fat, Acid, Heat", bookId: book.id },
    });

    await recordBookLookupResult(lookup.id, [candidate()], { status: "MATCHED", candidate: candidate(), reason: "x" });

    expect(await prisma.book.count()).toBe(1);
    expect(await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).toMatchObject({
      matchStatus: "AUTO_MATCHED",
      openLibraryWorkKey: "/works/OL17801197W",
      authors: ["Samin Nosrat"],
    });
    expect((await getNoteSources(noteId))[0]?.source.id).toBe(source.id);
  });

  it("makes a book primary over a URL", async () => {
    const noteId = await createNote("A");
    await attachImportedSource(noteId, "https://example.com/salt");
    const attached = await attachImportedSource(noteId, "Salt, Fat, Acid, Heat");
    await recordBookLookupResult(attached!.bookLookupIdToRun!, [candidate()], {
      status: "MATCHED",
      candidate: candidate(),
      reason: "x",
    });
    const links = await getNoteSources(noteId);
    expect(links.map((link) => [link.source.kind, link.isPrimary])).toEqual([
      ["BOOK", true],
      ["URL", false],
    ]);
  });
});

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../client.js";
import { backfillImportIntegrity } from "../import-integrity-backfill.js";
import { getNoteDetail } from "../note.js";
import { createNote, hasTestDatabase, resetDatabase } from "../ontology/__tests__/int-helpers.js";
import { getRecipeDetail, promoteNoteToRecipe } from "../recipe.js";
import { attachImportedSource } from "../source.js";

/**
 * Rows the backfill merges (URL sources that normalize alike, categories that differ only by case) cannot exist once the contract migration has run, so those paths are verified by replaying expand, backfill, and contract on legacy data (docs/architecture/import-integrity.md).
 */

describe.skipIf(!hasTestDatabase)("import integrity backfill", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("is idempotent", async () => {
    await createNote("Soup");
    await createNote("Stew");

    const first = await backfillImportIntegrity();
    expect(first.notesHashed).toBe(2);

    const second = await backfillImportIntegrity();
    expect(second).toMatchObject({
      urlsNormalized: 0,
      urlSourcesMerged: 0,
      bookSourcesKeyed: 0,
      bookLookupsCreated: 0,
      categoriesSlugged: 0,
      categoriesMerged: 0,
      notesHashed: 0,
      duplicateCandidatesCreated: 0,
    });
  });

  it("queues one lookup per legacy unmatched book", async () => {
    const noteId = await createNote("Roast");
    const book = await prisma.book.create({ data: { title: "The Joy of Cooking" } });
    const source = await prisma.source.create({ data: { kind: "BOOK", bookId: book.id, canonicalKey: `book:${book.id}` } });
    await prisma.noteSource.create({ data: { noteId, sourceId: source.id, isPrimary: true } });

    const report = await backfillImportIntegrity();
    expect(report.bookLookupsCreated).toBe(1);
    expect(await prisma.bookLookup.findFirstOrThrow()).toMatchObject({
      queryKey: "the joy of cooking",
      status: "PENDING",
      bookId: book.id,
    });
  });

  it("turns earlier DUPLICATE flags into pending candidates", async () => {
    const existing = await createNote("Pancakes");
    const incoming = await prisma.note.create({
      data: {
        title: "Pancakes",
        html: "<p></p>",
        status: "DUPLICATE",
        duplicateConfidence: 0.95,
        errorDetails: { duplicateNoteIds: [existing, "missing-note"] },
      },
    });

    const report = await backfillImportIntegrity();
    expect(report.duplicateCandidatesCreated).toBe(1);
    expect(await prisma.duplicateCandidate.findFirstOrThrow()).toMatchObject({
      noteId: incoming.id,
      existingNoteId: existing,
      kind: "LIKELY",
      confidence: 0.95,
      status: "PENDING",
    });
  });
});

describe.skipIf(!hasTestDatabase)("recipes read through their note", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("shows the note's sources and categories on the recipe", async () => {
    const noteId = await createNote("Curry");
    await attachImportedSource(noteId, "https://example.com/curry");
    const category = await prisma.category.create({ data: { name: "Curry", slug: "curry" } });
    await prisma.noteCategory.create({
      data: { noteId, categoryId: category.id, state: "APPROVED", origin: "MANUAL" },
    });

    const recipe = await promoteNoteToRecipe(noteId);
    const [note, detail] = await Promise.all([getNoteDetail(noteId), getRecipeDetail(recipe.id)]);

    expect(detail?.sources).toEqual(note?.sources);
    expect(detail?.categories.map((membership) => membership.category.name)).toEqual(["Curry"]);
    expect(note?.sources[0]).toMatchObject({ isPrimary: true, source: { kind: "URL" } });
  });
});

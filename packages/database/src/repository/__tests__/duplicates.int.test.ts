import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../client.js";
import { computeContentHash, computeRawHtmlHash } from "../../import-integrity/content-hash.js";
import { simHashBands } from "../../import-integrity/simhash.js";
import {
  findDuplicateMatches,
  getDuplicateCounts,
  listDuplicateCandidates,
  previewDuplicateResolution,
  recordDuplicateCandidates,
  resolveDuplicate,
  resolveExactDuplicatesBatch,
  undoDuplicateResolution,
} from "../duplicates.js";
import { hasTestDatabase, resetDatabase } from "../ontology/__tests__/int-helpers.js";
import { promoteNoteToRecipe } from "../recipe.js";
import { attachImportedSource, getNoteSources, recordUrlCheck } from "../source.js";

const TITLE_HASH = "1".repeat(16) + "0".repeat(16);

async function importNote(title: string, lines: string[], options: { html?: string; titleSimHash?: string } = {}) {
  const html = options.html ?? `<en-note><h1>${title}</h1>${lines.join("<br>")}</en-note>`;
  const note = await prisma.note.create({
    data: {
      title,
      html,
      status: "PROCESSING",
      rawHtmlHash: computeRawHtmlHash(html),
      contentHash: computeContentHash({ title, ingredientLines: lines, instructionLines: [] }),
      titleSimHash: options.titleSimHash ?? null,
      titleSimHashBands: options.titleSimHash ? simHashBands(options.titleSimHash) : [],
      parsedIngredientLines: {
        create: lines.map((reference, lineIndex) => ({ reference, blockIndex: 0, lineIndex })),
      },
    },
    select: { id: true },
  });
  return note.id;
}

async function detect(noteId: string) {
  return recordDuplicateCandidates(noteId, await findDuplicateMatches(noteId));
}

describe.skipIf(!hasTestDatabase)("duplicate detection", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("flags the same file imported again as EXACT and holds the note", async () => {
    const existing = await importNote("Chili", ["1 onion", "2 lb beef"]);
    const incoming = await importNote("Chili", ["1 onion", "2 lb beef"]);

    const result = await detect(incoming);
    expect(result).toMatchObject({ blocking: true, highestConfidence: 1 });
    const candidate = await prisma.duplicateCandidate.findFirstOrThrow();
    expect(candidate).toMatchObject({ noteId: incoming, existingNoteId: existing, kind: "EXACT", status: "PENDING" });
    expect((await prisma.note.findUniqueOrThrow({ where: { id: incoming } })).status).toBe("DUPLICATE");
  });

  it("treats a shared source with a near-identical title as LIKELY", async () => {
    const existing = await importNote("Weeknight Chili", ["1 onion"], { titleSimHash: TITLE_HASH });
    const incoming = await importNote("Weeknight Chili!", ["2 onions", "salt"], {
      titleSimHash: `${TITLE_HASH.slice(0, 31)}1`,
    });
    await attachImportedSource(existing, "https://example.com/chili");
    await attachImportedSource(incoming, "https://example.com/chili?utm_source=rss");

    const [match] = await findDuplicateMatches(incoming);
    expect(match).toMatchObject({ existingNoteId: existing, kind: "LIKELY" });
    expect(match?.signals.sharedSourceIds).toHaveLength(1);
    expect(match?.signals.reasons).toContain("Same source");
  });

  it("lists weak title matches as POSSIBLE without holding the note", async () => {
    await importNote("Chili", ["1 onion", "2 lb beef"], { titleSimHash: TITLE_HASH });
    const incoming = await importNote("Chili verde", ["1 lb tomatillos"], { titleSimHash: `${TITLE_HASH.slice(0, 30)}11` });

    const result = await detect(incoming);
    expect(result.blocking).toBe(false);
    expect(await prisma.duplicateCandidate.findFirstOrThrow()).toMatchObject({ kind: "POSSIBLE" });
    expect((await prisma.note.findUniqueOrThrow({ where: { id: incoming } })).status).toBe("PROCESSING");
  });

  it("never raises a pair a reviewer already settled, and ignores archived notes", async () => {
    const existing = await importNote("Chili", ["1 onion"]);
    const incoming = await importNote("Chili", ["1 onion"]);
    await detect(incoming);
    const candidate = await prisma.duplicateCandidate.findFirstOrThrow();
    await resolveDuplicate(candidate.id, { keep: "BOTH", mergeSources: false }, null);

    expect((await detect(incoming)).candidateIds).toEqual([]);
    expect((await detect(existing)).candidateIds).toEqual([]);

    await prisma.note.update({ where: { id: existing }, data: { archivedAt: new Date() } });
    expect(await findDuplicateMatches(incoming)).toEqual([]);
  });
});

describe.skipIf(!hasTestDatabase)("duplicate resolution", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function pair() {
    const existing = await importNote("Chili", ["1 onion", "2 lb beef"]);
    const incoming = await importNote("Chili", ["1 onion", "2 lb beef"]);
    await attachImportedSource(existing, "Salt, Fat, Acid, Heat");
    await attachImportedSource(incoming, "https://example.com/chili");
    await detect(incoming);
    const candidate = await prisma.duplicateCandidate.findFirstOrThrow();
    return { existing, incoming, candidateId: candidate.id };
  }

  async function snapshot() {
    const [notes, noteSources, memberships, recipes, candidates] = await Promise.all([
      prisma.note.findMany({
        orderBy: { id: "asc" },
        select: { id: true, status: true, archivedAt: true, supersededById: true, tags: { select: { id: true } } },
      }),
      prisma.noteSource.findMany({ orderBy: { id: "asc" }, select: { noteId: true, sourceId: true, isPrimary: true } }),
      prisma.noteCategory.findMany({ orderBy: { id: "asc" }, select: { noteId: true, categoryId: true, state: true } }),
      prisma.recipe.findMany({ select: { id: true, noteId: true } }),
      prisma.duplicateCandidate.findMany({ select: { id: true, status: true } }),
    ]);
    return { notes, noteSources, memberships, recipes, candidates };
  }

  it("keeps the existing note, archives the copy, and merges its sources without deleting anything", async () => {
    const { existing, incoming, candidateId } = await pair();
    const before = await snapshot();

    const preview = await previewDuplicateResolution(candidateId, { keep: "EXISTING", mergeSources: true });
    expect(preview.archivedNote?.id).toBe(incoming);
    expect(preview.attachedSources).toEqual([expect.objectContaining({ label: "https://example.com/chili", inactive: false })]);
    expect(await snapshot()).toEqual(before);

    await resolveDuplicate(candidateId, { keep: "EXISTING", mergeSources: true }, null);

    const archived = await prisma.note.findUniqueOrThrow({ where: { id: incoming } });
    expect(archived).toMatchObject({ supersededById: existing });
    expect(archived.archivedAt).not.toBeNull();
    expect(await prisma.parsedIngredientLine.count({ where: { noteId: incoming } })).toBe(2);

    // Unmatched text ranks below a URL, so the merged URL becomes primary until the text matches a book
    const kept = await getNoteSources(existing);
    expect(kept.map((link) => [link.source.kind, link.origin, link.isPrimary])).toEqual([
      ["URL", "DUPLICATE_MERGE", true],
      ["OTHER", "EVERNOTE_IMPORT", false],
    ]);
    expect((await getNoteSources(incoming))).toHaveLength(1);
  });

  it("never makes an unreachable URL the primary source of the kept note", async () => {
    const existing = await importNote("Soup", ["1 leek"]);
    const incoming = await importNote("Soup", ["1 leek"]);
    const good = await attachImportedSource(existing, "https://example.com/soup-old");
    const bad = await attachImportedSource(incoming, "https://gone.example/soup");
    await recordUrlCheck(good!.urlIdToCheck!, { status: "REACHABLE", httpStatus: 200, finalUrl: null, canonicalUrl: null, failureReason: null });
    await recordUrlCheck(bad!.urlIdToCheck!, { status: "UNREACHABLE", httpStatus: 404, finalUrl: null, canonicalUrl: null, failureReason: "HTTP 404" });
    await detect(incoming);
    const candidate = await prisma.duplicateCandidate.findFirstOrThrow();

    const preview = await previewDuplicateResolution(candidate.id, { keep: "EXISTING", mergeSources: true });
    expect(preview.attachedSources[0]?.inactive).toBe(true);
    await resolveDuplicate(candidate.id, { keep: "EXISTING", mergeSources: true }, null);
    const links = await getNoteSources(existing);
    expect(links.find((link) => link.isPrimary)?.source.id).toBe(good!.sourceId);
  });

  it("keeps the incoming note and carries over the existing note's curation and recipe", async () => {
    const { existing, incoming, candidateId } = await pair();
    const recipe = await promoteNoteToRecipe(existing);
    const tag = await prisma.tag.create({ data: { name: "weeknight" } });
    await prisma.note.update({ where: { id: existing }, data: { tags: { connect: { id: tag.id } } } });
    const thanksgiving = await prisma.category.create({ data: { name: "Thanksgiving", slug: "thanksgiving" } });
    const beef = await prisma.category.create({ data: { name: "Beef", slug: "beef", kind: "CONCEPT" } });
    await prisma.noteCategory.createMany({
      data: [
        { noteId: existing, categoryId: thanksgiving.id, state: "APPROVED", origin: "MANUAL" },
        { noteId: existing, categoryId: beef.id, state: "EXCLUDED", origin: "MANUAL" },
        { noteId: incoming, categoryId: beef.id, state: "INFERRED", origin: "CONCEPT_RULE" },
      ],
    });
    const before = await snapshot();

    const result = await resolveDuplicate(candidateId, { keep: "INCOMING", mergeSources: false }, null);
    expect(result.preview.summary.join(" ")).toContain("recipe moves");

    expect((await prisma.recipe.findUniqueOrThrow({ where: { id: recipe.id } })).noteId).toBe(incoming);
    expect((await prisma.note.findUniqueOrThrow({ where: { id: incoming } })).status).toBe("COMPLETED");
    const memberships = await prisma.noteCategory.findMany({ where: { noteId: incoming }, orderBy: { categoryId: "asc" } });
    expect(memberships.map((row) => [row.categoryId, row.state]).sort()).toEqual(
      [
        [beef.id, "EXCLUDED"],
        [thanksgiving.id, "APPROVED"],
      ].sort()
    );
    expect(await prisma.tag.count({ where: { notes: { some: { id: incoming } } } })).toBe(1);

    await undoDuplicateResolution(candidateId);
    expect(await snapshot()).toEqual(before);
  });

  it("keeping both releases the note and records the pair as settled", async () => {
    const { incoming, candidateId } = await pair();
    await resolveDuplicate(candidateId, { keep: "BOTH", mergeSources: true }, null);
    expect((await prisma.note.findUniqueOrThrow({ where: { id: incoming } })).status).toBe("COMPLETED");
    expect(await prisma.duplicateCandidate.findUniqueOrThrow({ where: { id: candidateId } })).toMatchObject({
      status: "DISMISSED",
    });
    expect(await prisma.note.count({ where: { archivedAt: { not: null } } })).toBe(0);
  });

  it("undo restores everything exactly", async () => {
    const { candidateId } = await pair();
    const before = await snapshot();
    await resolveDuplicate(candidateId, { keep: "EXISTING", mergeSources: true }, null);
    await undoDuplicateResolution(candidateId);
    expect(await snapshot()).toEqual(before);
  });

  it("is idempotent: the same decision twice does nothing; a different one needs undo", async () => {
    const { candidateId } = await pair();
    await resolveDuplicate(candidateId, { keep: "EXISTING", mergeSources: true }, null);
    const afterFirst = await snapshot();

    const again = await resolveDuplicate(candidateId, { keep: "EXISTING", mergeSources: true }, null);
    expect(again.alreadyResolved).toBe(true);
    expect(await snapshot()).toEqual(afterFirst);

    await expect(resolveDuplicate(candidateId, { keep: "INCOMING", mergeSources: true }, null)).rejects.toThrow(
      "Undo that decision first"
    );
  });

  it("settles every exact pair in one batch and counts the rest", async () => {
    await pair();
    const third = await importNote("Chili", ["1 onion", "2 lb beef"]);
    await detect(third);
    expect((await getDuplicateCounts()).EXACT).toBeGreaterThanOrEqual(2);

    const result = await resolveExactDuplicatesBatch(null);
    expect(result.resolved).toBeGreaterThanOrEqual(1);
    expect((await listDuplicateCandidates({ kinds: ["EXACT"] })).total).toBe(0);
    expect(await prisma.note.count({ where: { archivedAt: null } })).toBe(1);
  });
});

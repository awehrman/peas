import { createNote, hasTestDatabase, resetDatabase } from "./int-helpers.js";

import { buildResolverContext, processIngredientLine } from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../../client.js";
import {
  type ModifierSeedEntry,
  seedLexiconModifiers,
} from "../../../seed/lexicon-modifiers.js";
import { seedOntologyVocabulary } from "../../../seed/ontology-vocabulary.js";
import {
  type StarterFoodsSeed,
  seedStarterFoods,
} from "../../../seed/starter-foods.js";
import { saveImportedLine } from "../backfill.js";
import {
  getLexiconEntryDetail,
  getUnknownExpressionSources,
  listLexiconEntryOccurrences,
  listUnknownExpressions,
} from "../lexicon-explorer.js";
import { listLexiconEntries } from "../lexicon.js";
import { loadResolverSnapshot } from "../resolver-context.js";

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          `../../../../../parser/fixtures/lexicon/${name}`,
          import.meta.url
        )
      ),
      "utf8"
    )
  ) as T;
}

async function noteWithLines(
  title: string,
  lines: string[],
  { isActive = true } = {}
): Promise<string> {
  const ctx = buildResolverContext(await loadResolverSnapshot());
  const noteId = await createNote(title);
  for (const [lineIndex, reference] of lines.entries()) {
    await saveImportedLine(
      {
        noteId,
        blockIndex: 0,
        lineIndex,
        reference,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        isActive,
        parserVersion: "v2:test",
        result: processIngredientLine(reference, ctx),
      },
      ctx
    );
  }
  return noteId;
}

async function entryId(text: string, role = "FOOD"): Promise<string> {
  return (
    await prisma.lexiconEntry.findFirstOrThrow({
      where: { text, role: role as "FOOD" },
      select: { id: true },
    })
  ).id;
}

describe.skipIf(!hasTestDatabase)("lexicon explorer (integration)", () => {
  let bookId: string;

  beforeAll(async () => {
    await resetDatabase();
    await seedOntologyVocabulary();
    await seedLexiconModifiers(
      fixture<{ entries: ModifierSeedEntry[] }>("modifiers.seed.json").entries
    );
    await seedStarterFoods(
      fixture<StarterFoodsSeed>("starter-foods.seed.json")
    );
    const braised = await noteWithLines("Braised thighs", [
      "1 lb boneless chicken thighs",
      "Salt and pepper",
      "3 tbsp calamansi juice",
    ]);
    await noteWithLines("Roast thighs", ["2 chicken thighs, diced"]);
    await noteWithLines("Inactive", ["4 chicken thighs"], { isActive: false });
    const archived = await noteWithLines("Archived", ["5 chicken thighs"]);
    await prisma.note.update({
      where: { id: archived },
      data: { archivedAt: new Date() },
    });

    const book = await prisma.source.create({
      data: {
        kind: "OTHER",
        canonicalKey: "text:island book",
        displayName: "Island Book",
      },
    });
    bookId = book.id;
    await prisma.noteSource.create({
      data: { noteId: braised, sourceId: book.id, isPrimary: true },
    });
    await prisma.source.create({
      data: { kind: "OTHER", canonicalKey: "text:other", displayName: "Other" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists the lines that used an entry, with the matched words", async () => {
    const page = await listLexiconEntryOccurrences(
      await entryId("chicken thighs")
    );
    expect(page.total).toBe(2);
    expect(page.nextCursor).toBeNull();
    expect(
      page.items.map((item) => [
        item.lineText,
        item.span?.text,
        item.conceptName,
        item.noteTitle,
      ])
    ).toEqual([
      [
        "1 lb boneless chicken thighs",
        "chicken thighs",
        "chicken thigh",
        "Braised thighs",
      ],
      [
        "2 chicken thighs, diced",
        "chicken thighs",
        "chicken thigh",
        "Roast thighs",
      ],
    ]);
  });

  it("finds modifier entries and keeps each coordinated part under its own word", async () => {
    const boneless = await prisma.lexiconEntry.findFirstOrThrow({
      where: { text: "boneless" },
      select: { id: true },
    });
    const attribute = await listLexiconEntryOccurrences(boneless.id);
    expect(attribute.items.map((item) => item.span?.text)).toEqual([
      "boneless",
    ]);

    const salt = await listLexiconEntryOccurrences(await entryId("salt"));
    expect(salt.items.map((item) => [item.lineText, item.span?.text])).toEqual([
      ["Salt and pepper", "Salt"],
    ]);
  });

  it("pages by cursor and rejects a malformed one", async () => {
    const id = await entryId("chicken thighs");
    const first = await listLexiconEntryOccurrences(id, { limit: 1 });
    expect(first.items).toHaveLength(1);
    const second = await listLexiconEntryOccurrences(id, {
      limit: 1,
      after: first.nextCursor,
    });
    expect(second.items[0]?.lineText).toBe("2 chicken thighs, diced");
    expect(second.nextCursor).toBeNull();
    await expect(
      listLexiconEntryOccurrences(id, { after: "nope" })
    ).rejects.toThrow(/Invalid occurrence cursor/);
    expect(
      await listLexiconEntryOccurrences("00000000-0000-4000-8000-000000000000")
    ).toEqual({
      items: [],
      total: 0,
      nextCursor: null,
    });
  });

  it("describes an entry with its revisions", async () => {
    const detail = await getLexiconEntryDetail(await entryId("chicken thighs"));
    expect(detail).toMatchObject({
      text: "chicken thighs",
      role: "FOOD",
      targetLabel: "chicken thigh",
      revisionRetired: null,
    });
    expect(detail?.revisionAdded).toBeGreaterThan(0);
    expect(
      await getLexiconEntryDetail("00000000-0000-4000-8000-000000000000")
    ).toBeNull();
  });

  it("lists the lexicon newest first when asked", async () => {
    const { items } = await listLexiconEntries({
      newestFirst: true,
      limit: 200,
    });
    const revisions = await Promise.all(
      [items[0], items[items.length - 1]].map(
        async (item) =>
          (await getLexiconEntryDetail(item?.id ?? ""))?.revisionAdded ?? 0
      )
    );
    expect(revisions[0]).toBeGreaterThan(revisions[1] ?? 0);
  });

  it("lists unknown expressions, optionally from one source's notes", async () => {
    const all = await listUnknownExpressions();
    const calamansi = all.items.find((item) =>
      item.phrase.includes("calamansi")
    );
    expect(calamansi).toMatchObject({
      type: "UNKNOWN_FOOD_PHRASE",
      notes: 1,
      mentions: 1,
    });

    const fromBook = await listUnknownExpressions({ sourceId: bookId });
    expect(fromBook.items.map((item) => item.phrase)).toContain(
      calamansi?.phrase
    );
    const other = await prisma.source.findUniqueOrThrow({
      where: { canonicalKey: "text:other" },
    });
    expect(await listUnknownExpressions({ sourceId: other.id })).toEqual({
      items: [],
      total: 0,
    });
    expect(
      (await listUnknownExpressions({ type: "AMBIGUOUS_MATCH" })).items.every(
        (item) => item.type === "AMBIGUOUS_MATCH"
      )
    ).toBe(true);

    expect(await getUnknownExpressionSources()).toEqual([
      { id: bookId, label: "Island Book", notes: 1 },
    ]);
  });
});

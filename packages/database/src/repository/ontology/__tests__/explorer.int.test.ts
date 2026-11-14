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
import { promoteNoteToRecipe } from "../../recipe.js";
import {
  getCorpusAnalyticsSnapshot,
  takeCorpusAnalyticsSnapshot,
  waitForCorpusAnalyticsRefresh,
} from "../analytics-snapshots.js";
import { saveImportedLine } from "../backfill.js";
import {
  RARE_NOTE_LIMIT,
  getConceptDistributions,
  getConceptOccurrenceFacets,
  getConceptUsage,
  getCorpusAnalytics,
  getObservedForms,
  listConceptOccurrences,
} from "../explorer.js";
import { getConceptNeighborhood } from "../graph.js";
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
  { isActive = true }: { isActive?: boolean } = {}
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

async function conceptId(slug: string): Promise<string> {
  return (
    await prisma.foodConcept.findUniqueOrThrow({
      where: { slug },
      select: { id: true },
    })
  ).id;
}

describe.skipIf(!hasTestDatabase)("corpus explorer (integration)", () => {
  let chicken: string;
  let chickenThigh: string;

  beforeAll(async () => {
    await resetDatabase();
    await seedOntologyVocabulary();
    await seedLexiconModifiers(
      fixture<{ entries: ModifierSeedEntry[] }>("modifiers.seed.json").entries
    );
    await seedStarterFoods(
      fixture<StarterFoodsSeed>("starter-foods.seed.json")
    );
    chicken = await conceptId("chicken");
    chickenThigh = await conceptId("chicken-thigh");

    const braised = await noteWithLines("Braised thighs", [
      "1 lb boneless chicken thighs",
      "4 chicken thighs, diced",
    ]);
    await promoteNoteToRecipe(braised);
    await noteWithLines("Roast chicken", ["1 chicken"]);
    await noteWithLines("Meatballs", ["1 lb ground chicken"]);
    await noteWithLines("Heritage roast", ["1 heritage chicken"]);
    const archived = await noteWithLines("Old copy", ["2 chicken thighs"]);
    await prisma.note.update({
      where: { id: archived },
      data: { archivedAt: new Date(), archivedReason: "duplicate" },
    });
    await noteWithLines("Inactive", ["3 chicken thighs"], { isActive: false });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("separates direct mentions from mentions of kinds and parts", async () => {
    const usage = await getConceptUsage(chicken);
    expect(usage.expand).toEqual(["IS_A", "PART_OF"]);
    expect(usage.direct).toEqual({
      mentions: 1,
      lines: 1,
      notes: 1,
      recipes: 0,
    });
    expect(usage.expanded).toEqual({
      mentions: 3,
      lines: 3,
      notes: 2,
      recipes: 1,
    });
    expect(usage.contributors).toEqual([
      {
        conceptId: chickenThigh,
        canonicalName: "chicken thigh",
        path: ["PART_OF"],
        depth: 1,
        counts: { mentions: 2, lines: 2, notes: 1, recipes: 1 },
      },
    ]);
  });

  it("follows 'made from' relationships only when asked", async () => {
    const usage = await getConceptUsage(chicken, {
      expand: ["IS_A", "PART_OF", "PROCESSED_FROM"],
    });
    expect(usage.expanded.mentions).toBe(4);
    expect(usage.contributors.map((c) => [c.canonicalName, c.path])).toEqual([
      ["chicken thigh", ["PART_OF"]],
      ["ground chicken", ["PROCESSED_FROM"]],
    ]);

    const exact = await getConceptUsage(chicken, { expand: [] });
    expect(exact.expanded).toEqual(exact.direct);
    expect(exact.contributors).toEqual([]);
  });

  it("counts mentions waiting for review only when asked, and always reports them by status", async () => {
    const settled = await getConceptUsage(chicken, { expand: [] });
    expect(settled.byStatus).toEqual({
      autoResolved: 1,
      verified: 0,
      needsReview: 1,
    });

    const withReview = await getConceptUsage(chicken, {
      expand: [],
      includeNeedsReview: true,
    });
    expect(withReview.direct).toEqual({
      mentions: 2,
      lines: 2,
      notes: 2,
      recipes: 0,
    });
  });

  it("ignores archived notes and inactive lines", async () => {
    const usage = await getConceptUsage(chickenThigh);
    expect(usage.direct.mentions).toBe(2);
    expect(usage.direct.notes).toBe(1);
  });

  it("lists how a concept is written, most used first, with names the corpus never uses", async () => {
    const { forms, otherMentions } = await getObservedForms(chickenThigh);
    expect(
      forms.map((form) => [form.text, form.kind, form.mentions, form.notes])
    ).toEqual([
      ["chicken thighs", "PLURAL", 2, 1],
      ["chicken thigh", "CANONICAL", 0, 0],
    ]);
    expect(forms[0]?.example).toMatch(/chicken thighs/);
    expect(forms[1]?.example).toBeNull();
    expect(otherMentions).toBe(0);
  });

  describe("occurrences", () => {
    let braisedId: string;
    let roastId: string;

    beforeAll(async () => {
      braisedId = (
        await prisma.note.findFirstOrThrow({
          where: { title: "Braised thighs" },
        })
      ).id;
      roastId = (
        await prisma.note.findFirstOrThrow({
          where: { title: "Roast chicken" },
        })
      ).id;
      const source = await prisma.source.create({
        data: {
          kind: "OTHER",
          canonicalKey: "text:weeknight book",
          displayName: "Weeknight Book",
        },
      });
      await prisma.noteSource.create({
        data: { noteId: braisedId, sourceId: source.id, isPrimary: true },
      });
      const dinner = await prisma.category.create({
        data: { name: "Dinner", slug: "dinner" },
      });
      const excluded = await prisma.category.create({
        data: { name: "Excluded", slug: "excluded" },
      });
      await prisma.noteCategory.create({
        data: {
          noteId: roastId,
          categoryId: dinner.id,
          state: "APPROVED",
          origin: "MANUAL",
        },
      });
      await prisma.noteCategory.create({
        data: {
          noteId: braisedId,
          categoryId: excluded.id,
          state: "EXCLUDED",
          origin: "MANUAL",
        },
      });
    });

    it("lists every counted mention in reading order with how it matched", async () => {
      const page = await listConceptOccurrences(chicken);
      expect(page.total).toBe(3);
      expect(page.hasNextPage).toBe(false);
      const byLine = Object.fromEntries(
        page.items.map((item) => [item.lineText, item])
      );
      expect(byLine["1 chicken"]).toMatchObject({
        noteId: roastId,
        noteTitle: "Roast chicken",
        recipeId: null,
        conceptName: "chicken",
        path: [],
        resolutionStatus: "AUTO_RESOLVED",
      });
      expect(byLine["4 chicken thighs, diced"]).toMatchObject({
        noteTitle: "Braised thighs",
        recipeTitle: "Braised thighs",
        conceptId: chickenThigh,
        conceptName: "chicken thigh",
        path: ["PART_OF"],
        preparations: ["Dice"],
      });
      expect(byLine["1 lb boneless chicken thighs"]?.attributes).toContain(
        "Bone: Boneless"
      );
      expect(byLine["1 lb boneless chicken thighs"]?.span.text).toContain(
        "chicken thighs"
      );
      const braised = page.items
        .filter((item) => item.noteId === braisedId)
        .map((item) => item.lineText);
      expect(braised).toEqual([
        "1 lb boneless chicken thighs",
        "4 chicken thighs, diced",
      ]);
    });

    it("pages with a cursor without repeating or skipping", async () => {
      const first = await listConceptOccurrences(chicken, {}, { limit: 2 });
      expect(first.items).toHaveLength(2);
      expect(first.hasNextPage).toBe(true);
      const second = await listConceptOccurrences(
        chicken,
        {},
        { after: first.endCursor, limit: 2 }
      );
      expect(second).toMatchObject({ hasNextPage: false, total: 3 });
      const all = [...first.items, ...second.items].map(
        (item) => item.mentionId
      );
      expect(new Set(all).size).toBe(3);
      expect(all).toEqual(
        (await listConceptOccurrences(chicken)).items.map(
          (item) => item.mentionId
        )
      );
      await expect(
        listConceptOccurrences(chicken, {}, { after: "not-a-cursor" })
      ).rejects.toThrow(/Invalid occurrence cursor/);
    });

    it("filters by preparation, attribute, source, category, and status", async () => {
      const lines = async (
        filter: Parameters<typeof listConceptOccurrences>[1]
      ) =>
        (await listConceptOccurrences(chicken, filter)).items.map(
          (item) => item.lineText
        );
      expect(await lines({ preparationKey: "dice" })).toEqual([
        "4 chicken thighs, diced",
      ]);
      expect(
        await lines({
          attribute: { definitionKey: "bone", valueKey: "boneless" },
        })
      ).toEqual(["1 lb boneless chicken thighs"]);
      const source = await prisma.source.findUniqueOrThrow({
        where: { canonicalKey: "text:weeknight book" },
      });
      expect(await lines({ sourceId: source.id })).toHaveLength(2);
      const dinner = await prisma.category.findUniqueOrThrow({
        where: { slug: "dinner" },
      });
      expect(await lines({ categoryId: dinner.id })).toEqual(["1 chicken"]);
      const excluded = await prisma.category.findUniqueOrThrow({
        where: { slug: "excluded" },
      });
      expect(await lines({ categoryId: excluded.id })).toEqual([]);
      expect(
        await lines({
          expand: [],
          includeNeedsReview: true,
          status: "NEEDS_REVIEW",
        })
      ).toEqual(["1 heritage chicken"]);
      expect(
        await lines({
          expand: ["IS_A", "PART_OF", "PROCESSED_FROM"],
          status: "AUTO_RESOLVED",
        })
      ).toHaveLength(4);
    });

    it("offers the sources and categories of the counted notes as filters", async () => {
      expect(await getConceptOccurrenceFacets(chicken)).toEqual({
        sources: [
          { id: expect.any(String), label: "Weeknight Book", notes: 1 },
        ],
        categories: [{ id: expect.any(String), name: "Dinner", notes: 1 }],
      });
      expect(
        (await getConceptOccurrenceFacets(chicken, { expand: [] })).sources
      ).toEqual([]);
    });
  });

  it("computes corpus analytics with direct and expanded counts kept apart", async () => {
    const analytics = await getCorpusAnalytics({ limit: 3 });
    expect(analytics).toMatchObject({
      settledMentions: 4,
      conceptsWithMentions: 3,
      rareConceptCount: 3,
    });
    expect(analytics.unusedVerifiedConcepts).toBeGreaterThan(0);
    expect(
      analytics.topDirect.map((rank) => [
        rank.canonicalName,
        rank.directMentions,
      ])
    ).toEqual([
      ["chicken thigh", 2],
      ["chicken", 1],
      ["ground chicken", 1],
    ]);
    expect(analytics.topExpanded[0]).toMatchObject({
      canonicalName: "chicken",
      directMentions: 1,
      directNotes: 1,
      expandedMentions: 3,
    });
    expect(analytics.rare.every((rank) => rank.directNotes <= 2)).toBe(true);
    expect(analytics.preparations).toEqual([
      { preparationKey: "dice", label: "Dice", mentions: 1, concepts: 1 },
    ]);
    expect(analytics.attributes).toContainEqual(
      expect.objectContaining({
        definitionKey: "bone",
        valueKey: "boneless",
        mentions: 1,
        asserted: 1,
      })
    );
  });

  it("serves analytics from a snapshot, refreshing a stale one in the background", async () => {
    await prisma.corpusAnalyticsSnapshot.deleteMany({});
    const first = await getCorpusAnalyticsSnapshot();
    expect(first).toMatchObject({ settledMentions: 4, isStale: false });
    expect(await prisma.corpusAnalyticsSnapshot.count()).toBe(1);

    const fresh = await getCorpusAnalyticsSnapshot();
    expect(fresh.computedAt).toBe(first.computedAt);
    expect(await prisma.corpusAnalyticsSnapshot.count()).toBe(1);

    const later = new Date(Date.parse(first.computedAt) + 16 * 60 * 1000);
    const stale = await getCorpusAnalyticsSnapshot({ now: () => later });
    expect(stale).toMatchObject({
      isStale: true,
      computedAt: first.computedAt,
    });
    await waitForCorpusAnalyticsRefresh();
    expect(await prisma.corpusAnalyticsSnapshot.count()).toBe(2);
    expect(
      (
        await prisma.corpusAnalyticsSnapshot.findFirstOrThrow({
          orderBy: { takenAt: "desc" },
        })
      ).trigger
    ).toBe("STALE");

    for (let index = 0; index < 30; index += 1)
      await takeCorpusAnalyticsSnapshot("MANUAL");
    expect(await prisma.corpusAnalyticsSnapshot.count()).toBe(30);
    expect(RARE_NOTE_LIMIT).toBe(2);
  });

  describe("neighborhood", () => {
    const names = (nodes: { canonicalName: string; level: number }[]) =>
      nodes.map((node) => `${node.canonicalName}@${node.level}`);

    it("walks both ways by levels, placing more general foods above and specific ones below", async () => {
      const graph = await getConceptNeighborhood(chickenThigh, { depth: 2 });
      expect(graph).toMatchObject({
        depth: 2,
        direction: "BOTH",
        truncated: false,
      });
      expect(names(graph?.nodes ?? [])).toEqual(
        expect.arrayContaining([
          "chicken@-1",
          "chicken thigh@0",
          "chicken breast@0",
          "ground chicken@0",
        ])
      );
      const thighNode = graph?.nodes.find((node) => node.id === chickenThigh);
      expect(thighNode?.directMentions).toBe(2);
      const partOf = graph?.edges.find(
        (edge) => edge.sourceId === chickenThigh
      );
      expect(partOf).toMatchObject({
        targetId: chicken,
        type: "PART_OF",
        status: "ACTIVE",
        decision: null,
      });
      expect(
        graph?.edges.every((edge) =>
          graph.nodes.some((node) => node.id === edge.sourceId)
        )
      ).toBe(true);
    });

    it("respects direction, relationship types, depth, and the node limit", async () => {
      const up = await getConceptNeighborhood(chickenThigh, {
        depth: 3,
        direction: "UP",
      });
      expect(names(up?.nodes ?? [])).toEqual(["chicken@-1", "chicken thigh@0"]);

      const processed = await getConceptNeighborhood(chicken, {
        depth: 1,
        types: ["PROCESSED_FROM"],
      });
      expect(names(processed?.nodes ?? [])).toEqual([
        "chicken@0",
        "ground chicken@1",
      ]);

      const limited = await getConceptNeighborhood(chicken, {
        depth: 1,
        limit: 2,
      });
      expect(limited?.nodes).toHaveLength(2);
      expect(limited?.truncated).toBe(true);

      expect((await getConceptNeighborhood(chicken, { depth: 9 }))?.depth).toBe(
        3
      );
      expect(
        await getConceptNeighborhood("00000000-0000-4000-8000-000000000000")
      ).toBeNull();
    });
  });

  it("distributes preparations and attributes, direct and expanded", async () => {
    const thigh = await getConceptDistributions(chickenThigh);
    expect(thigh.preparations).toEqual([
      {
        preparationKey: "dice",
        label: expect.any(String),
        degreeKey: null,
        direct: 1,
        expanded: 1,
      },
    ]);
    expect(thigh.attributes).toContainEqual(
      expect.objectContaining({
        definitionKey: "bone",
        valueKey: "boneless",
        direct: 1,
        expanded: 1,
        asserted: 1,
      })
    );

    const whole = await getConceptDistributions(chicken);
    expect(whole.preparations).toEqual([
      expect.objectContaining({
        preparationKey: "dice",
        direct: 0,
        expanded: 1,
      }),
    ]);
    expect(
      (await getConceptDistributions(chicken, { expand: [] })).preparations
    ).toEqual([]);
  });
});

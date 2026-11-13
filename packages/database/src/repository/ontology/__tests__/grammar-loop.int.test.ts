import {
  createNote,
  createUser,
  hasTestDatabase,
  resetDatabase,
  seedSemanticOntology,
} from "./int-helpers.js";

import {
  type ResolverContext,
  buildResolverContext,
  processIngredientLine,
} from "@peas/parser/v2";
import { Prisma } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../../client.js";
import { seedOntologyVocabulary } from "../../../seed/ontology-vocabulary.js";
import { applyDecision } from "../apply-decision.js";
import { processLines, saveImportedLine } from "../backfill.js";
import {
  dryRunReparse,
  exploratorySweep,
  formatReparseReport,
  markDiscoveryAsNoise,
  pendingFixtureLines,
} from "../grammar-loop.js";
import {
  addDecisionMentionsChanged,
  getHealthTrends,
  takeCorpusHealthSnapshot,
} from "../health-trends.js";
import { loadResolverSnapshot } from "../resolver-context.js";

async function context(): Promise<ResolverContext> {
  return buildResolverContext(await loadResolverSnapshot());
}

async function importLines(lines: string[], title = "Stew") {
  const ctx = await context();
  const noteId = await createNote(title);
  const lineIds: string[] = [];
  for (const [lineIndex, reference] of lines.entries()) {
    const { lineId } = await saveImportedLine(
      {
        noteId,
        blockIndex: 0,
        lineIndex,
        reference,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        isActive: true,
        parserVersion: "v2:test",
        result: processIngredientLine(reference, ctx),
      },
      ctx
    );
    lineIds.push(lineId);
  }
  return { noteId, lineIds };
}

const structural = (key: string) =>
  prisma.discovery.findUniqueOrThrow({
    where: { type_key: { type: "STRUCTURAL_PATTERN", key } },
    select: { id: true, status: true, mentionCount: true, payload: true },
  });

describe.skipIf(!hasTestDatabase)("grammar evolution loop (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedOntologyVocabulary();
    await seedSemanticOntology();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("records structural patterns on import and marks noise lines inactive", async () => {
    const { lineIds } = await importLines([
      "rosemary 2 sprigs fresh",
      "thyme 4 sprigs fresh",
      "For the glaze:",
      "1 cup milk",
    ]);

    const sprigs = await structural("W N U W");
    expect(sprigs).toMatchObject({
      status: "OPEN",
      mentionCount: 2,
      payload: {
        type: "STRUCTURAL_PATTERN",
        signature: "W N U W",
        reason: "QUANTITY_IN_PHRASE",
      },
    });
    const heading = await structural("W :");
    expect(heading.mentionCount).toBe(1);

    expect(
      (await pendingFixtureLines({ discoveryId: sprigs.id })).map((row) => row.input).sort()
    ).toEqual(["rosemary 2 sprigs fresh", "thyme 4 sprigs fresh"]);
    expect(
      (await pendingFixtureLines({ signature: "W :" })).map((row) => row.input)
    ).toEqual(["For the glaze:"]);

    expect(await markDiscoveryAsNoise(heading.id)).toEqual({ linesDeactivated: 1 });
    expect((await structural("W :")).status).toBe("REJECTED");
    const glaze = await prisma.parsedIngredientLine.findUniqueOrThrow({
      where: { id: lineIds[2] },
    });
    expect(glaze.isActive).toBe(false);
    await expect(markDiscoveryAsNoise(
      (
        await prisma.discovery.findFirstOrThrow({
          where: { type: { not: "STRUCTURAL_PATTERN" } },
          select: { id: true },
        })
      ).id
    )).rejects.toThrow("Only structural patterns");
  });

  it("resolves a structural discovery once reparsed lines no longer show it", async () => {
    const { lineIds } = await importLines(["small handful parsley, chopped"]);
    const [mention] = await prisma.ingredientMention.findMany({
      where: { parsedLineId: lineIds[0] },
    });
    const old = await prisma.discovery.create({
      data: {
        type: "STRUCTURAL_PATTERN",
        key: "W U W",
        payload: {
          type: "STRUCTURAL_PATTERN",
          signature: "W U W",
          example: "small handful parsley, chopped",
          parserVersion: "2.0.0",
        },
        firstSeenRevision: 1,
        lastSeenRevision: 1,
        mentionCount: 1,
        evidence: {
          create: {
            mentionId: mention?.id ?? "",
            spanStart: 6,
            spanEnd: 13,
          },
        },
      },
    });

    const ctx = await context();
    const lines = await prisma.parsedIngredientLine.findMany({
      where: { id: { in: lineIds } },
      select: { id: true, reference: true, noteId: true },
    });
    await prisma.$transaction((tx) => processLines(tx, lines, ctx));

    expect(
      await prisma.discovery.findUniqueOrThrow({
        where: { id: old.id },
        select: { status: true, mentionCount: true },
      })
    ).toEqual({ status: "RESOLVED", mentionCount: 0 });
  });

  it("sweeps unresolved mentions in exploratory mode without writing mentions", async () => {
    await importLines(["3 tablespoons calamansi juice", "1 cup milk"]);
    const before = await prisma.ingredientMention.findMany({
      orderBy: { id: "asc" },
      select: { id: true, updatedAt: true, resolutionStatus: true },
    });
    await prisma.discovery.deleteMany({});

    const summary = await exploratorySweep(await context());
    expect(summary.linesScanned).toBe(1);
    expect(summary.discoveriesTouched).toBeGreaterThan(0);
    const found = await prisma.discovery.findUniqueOrThrow({
      where: { type_key: { type: "UNKNOWN_FOOD_PHRASE", key: "calamansi juice" } },
      select: { payload: true, mentionCount: true },
    });
    expect(found).toMatchObject({
      payload: { source: "exploratory" },
      mentionCount: 1,
    });
    expect(
      await prisma.ingredientMention.findMany({
        orderBy: { id: "asc" },
        select: { id: true, updatedAt: true, resolutionStatus: true },
      })
    ).toEqual(before);

    await prisma.discovery.update({
      where: { type_key: { type: "UNKNOWN_FOOD_PHRASE", key: "calamansi juice" } },
      data: {
        payload: { type: "UNKNOWN_FOOD_PHRASE", phrase: "calamansi juice", headToken: "juice" },
      },
    });
    await exploratorySweep(await context());
    expect(
      (
        await prisma.discovery.findUniqueOrThrow({
          where: { type_key: { type: "UNKNOWN_FOOD_PHRASE", key: "calamansi juice" } },
          select: { payload: true },
        })
      ).payload
    ).not.toHaveProperty("source");
  });

  it("reports what a reparse would change, including verified conflicts, without writing", async () => {
    const { lineIds } = await importLines([
      "small handful parsley, chopped",
      "2 cups milk",
    ]);
    const [parsley, milk] = await Promise.all(
      lineIds.map((id) =>
        prisma.ingredientMention.findFirstOrThrow({ where: { parsedLineId: id } })
      )
    );
    await prisma.ingredientMention.update({
      where: { id: parsley?.id },
      data: { quantity: Prisma.DbNull, parserVersion: "2.0.0" },
    });
    await prisma.ingredientMention.update({
      where: { id: milk?.id },
      data: { quantity: Prisma.DbNull, verifiedAt: new Date() },
    });

    const report = await dryRunReparse(await context(), { batchSize: 1 });
    expect(report).toMatchObject({
      linesScanned: 2,
      mentionsCompared: 2,
      counts: { quantity: 1, parseStatus: 0, segments: 0 },
    });
    expect(report.storedVersions).toMatchObject({ "2.0.0": 1 });
    expect(report.examples.quantity).toEqual([
      expect.objectContaining({
        lineText: "small handful parsley, chopped",
        before: "(none)",
        after: "(1) handful",
      }),
    ]);
    expect(report.verifiedConflicts).toEqual([
      expect.objectContaining({ lineText: "2 cups milk" }),
    ]);
    expect(
      (await prisma.ingredientMention.findUniqueOrThrow({ where: { id: parsley?.id } }))
        .quantity
    ).toBeNull();

    const markdown = formatReparseReport(report);
    expect(markdown).toContain("# Dry-run reparse with parser");
    expect(markdown).toContain("| Quantity | 1 |");
    expect(markdown).toContain("## Verified mentions to review");
  });

  it("stores health snapshots and summarizes review throughput by week", async () => {
    await importLines(["1 cup milk", "3 tablespoons calamansi juice"]);
    const snapshot = await takeCorpusHealthSnapshot("MANUAL");
    expect(snapshot).toMatchObject({
      trigger: "MANUAL",
      totalLines: 2,
      totalMentions: 2,
      byResolutionStatus: { AUTO_RESOLVED: 1, UNRESOLVED: 1 },
      openDiscoveriesByType: { UNKNOWN_FOOD_PHRASE: 1 },
    });
    expect(Object.values(snapshot.byParserVersion)).toEqual([
      { total: 2, unresolved: 1 },
    ]);
    expect(await prisma.corpusHealthSnapshot.count()).toBe(1);

    const userId = await createUser();
    const milk = await prisma.foodConcept.findFirstOrThrow({
      where: { canonicalName: "milk" },
    });
    const applied = await applyDecision({
      payload: {
        type: "MAP_TO_CONCEPT",
        phrase: "calamansi juice",
        conceptId: milk.id,
        kind: "ALIAS",
      },
      userId,
      discoveryId: null,
    });
    await addDecisionMentionsChanged({ revision: applied.revision }, 4);
    await addDecisionMentionsChanged({ id: applied.decisionId }, 0);

    const trends = await getHealthTrends();
    expect(trends.snapshots).toHaveLength(1);
    expect(trends.reviewByWeek).toEqual([
      expect.objectContaining({ decisions: 1, mentionsChanged: 4 }),
    ]);
    expect(trends.topUnknownPhrases).toEqual([
      expect.objectContaining({ phrase: "calamansi juice", type: "UNKNOWN_FOOD_PHRASE" }),
    ]);
  });
});

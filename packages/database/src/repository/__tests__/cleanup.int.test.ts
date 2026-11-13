import { buildResolverContext, processIngredientLine } from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../client.js";
import {
  type ModifierSeedEntry,
  seedLexiconModifiers,
} from "../../seed/lexicon-modifiers.js";
import { seedOntologyVocabulary } from "../../seed/ontology-vocabulary.js";
import {
  type StarterFoodsSeed,
  seedStarterFoods,
} from "../../seed/starter-foods.js";
import { cleanupAllData } from "../cleanup.js";
import {
  createNote,
  createUser,
  hasTestDatabase,
  resetDatabase,
  withReviewQueue,
} from "../ontology/__tests__/int-helpers.js";
import { applyDecision } from "../ontology/apply-decision.js";
import { saveImportedLine } from "../ontology/backfill.js";
import { takeCorpusHealthSnapshot } from "../ontology/health-trends.js";
import { loadResolverSnapshot } from "../ontology/resolver-context.js";
import { getCurrentRevision } from "../ontology/revision.js";

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(`../../../../parser/fixtures/lexicon/${name}`, import.meta.url)
      ),
      "utf8"
    )
  ) as T;
}

const modifiers = fixture<{ entries: ModifierSeedEntry[] }>(
  "modifiers.seed.json"
).entries;
const starterFoods = withReviewQueue(
  fixture<StarterFoodsSeed>("starter-foods.seed.json")
);

async function seedKnowledge() {
  await seedOntologyVocabulary();
  await seedLexiconModifiers(modifiers);
  await seedStarterFoods(starterFoods);
}

/** Imports one line, approves a proposed food, and records the review cards, mapping, and snapshot a cleanup has to deal with. */
async function importAndReview() {
  const ctx = buildResolverContext(await loadResolverSnapshot());
  const noteId = await createNote("Roast chicken");
  await saveImportedLine(
    {
      noteId,
      blockIndex: 0,
      lineIndex: 0,
      reference: "2 cups whole milk",
      parseStatus: "COMPLETED_SUCCESSFULLY",
      isActive: true,
      parserVersion: "v2:test",
      result: processIngredientLine("2 cups whole milk", ctx),
    },
    ctx
  );

  const userId = await createUser();
  const drumstick = await prisma.foodConcept.findFirstOrThrow({
    where: { canonicalName: "chicken drumstick" },
    select: { id: true },
  });
  await applyDecision({
    payload: { type: "APPROVE_CONCEPT", conceptId: drumstick.id },
    userId,
    discoveryId: null,
  });
  await prisma.discovery.create({
    data: {
      type: "UNKNOWN_FOOD_PHRASE",
      key: "cleanup resolved",
      status: "RESOLVED",
      payload: {
        type: "UNKNOWN_FOOD_PHRASE",
        phrase: "cleanup resolved",
        headToken: "resolved",
      },
      firstSeenRevision: 1,
      lastSeenRevision: 1,
    },
  });
  await prisma.legacyIngredientMapping.create({
    data: {
      legacyIngredientId: "legacy-drumstick",
      conceptId: drumstick.id,
      status: "MAPPED",
    },
  });
  await takeCorpusHealthSnapshot("MANUAL");
}

describe.skipIf(!hasTestDatabase)("cleanupAllData (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedKnowledge();
    await importAndReview();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("deletes imported data and keeps food knowledge, decisions, mappings, and snapshots by default", async () => {
    const concepts = await prisma.foodConcept.count();
    const entries = await prisma.lexiconEntry.count();
    const revision = await getCurrentRevision();

    const { deletedCounts } = await cleanupAllData();

    expect(deletedCounts).toMatchObject({ notes: 1, ingredientLines: 1 });
    expect(deletedCounts).not.toHaveProperty("concepts");
    expect(await prisma.ingredientMention.count()).toBe(0);
    expect(await prisma.foodConcept.count()).toBe(concepts);
    expect(await prisma.lexiconEntry.count()).toBe(entries);
    expect(await prisma.lexiconDecision.count()).toBe(1);
    expect(
      await prisma.discovery.count({ where: { status: "RESOLVED" } })
    ).toBe(1);
    expect(await prisma.legacyIngredientMapping.count()).toBe(1);
    expect(await prisma.corpusHealthSnapshot.count()).toBe(1);
    expect(await getCurrentRevision()).toBe(revision);
  });

  it("with includeOntology also deletes food knowledge, keeps users, and records a reset revision the seeds can build on", async () => {
    const concepts = await prisma.foodConcept.count();
    const revision = await getCurrentRevision();

    const { deletedCounts } = await cleanupAllData({ includeOntology: true });

    expect(deletedCounts).toMatchObject({
      notes: 1,
      ingredientLines: 1,
      concepts,
      decisions: 1,
      legacyMappings: 1,
      healthSnapshots: 1,
    });
    expect(deletedCounts.lexiconEntries).toBeGreaterThan(0);
    expect(deletedCounts.attributeDefinitions).toBeGreaterThan(0);
    for (const count of await Promise.all([
      prisma.foodConcept.count(),
      prisma.lexiconEntry.count(),
      prisma.foodRelationship.count(),
      prisma.foodClassification.count(),
      prisma.attributeDefinition.count(),
      prisma.preparationOperation.count(),
      prisma.lexiconDecision.count(),
      prisma.discovery.count(),
      prisma.legacyIngredientMapping.count(),
      prisma.corpusHealthSnapshot.count(),
    ]))
      expect(count).toBe(0);
    expect(await prisma.user.count()).toBe(1);

    const reset = await prisma.lexiconRevision.findFirstOrThrow({
      orderBy: { id: "desc" },
    });
    expect(reset).toMatchObject({ id: revision + 1, reason: "reset:ontology" });

    await seedKnowledge();
    expect(await prisma.foodConcept.count()).toBe(concepts);
  });
});

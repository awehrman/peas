import { buildResolverContext, processIngredientLine } from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../client.js";
import {
  createLine,
  createNote,
  hasTestDatabase,
  resetDatabase,
} from "../../repository/ontology/__tests__/int-helpers.js";
import { createLexiconEntries } from "../../repository/ontology/lexicon.js";
import { loadResolverSnapshot } from "../../repository/ontology/resolver-context.js";
import {
  type ModifierSeedEntry,
  seedLexiconModifiers,
} from "../lexicon-modifiers.js";
import { seedOntologyFromLegacy } from "../ontology-from-legacy.js";
import { seedOntologyVocabulary } from "../ontology-vocabulary.js";

const modifierSeed = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../../../../parser/fixtures/lexicon/modifiers.seed.json",
        import.meta.url
      )
    ),
    "utf8"
  )
) as { entries: ModifierSeedEntry[] };

async function createLegacyIngredients() {
  const category = await prisma.ingredientCategory.create({
    data: { name: "Alliums" },
  });
  const tag = await prisma.ingredientTag.create({ data: { name: "pantry" } });
  const brand = await prisma.brand.create({ data: { name: "Kirkland" } });
  const create = async (name: string, data: Record<string, unknown> = {}) =>
    (
      await prisma.ingredient.create({
        data: { name, ...data },
        select: { id: true },
      })
    ).id;

  const shallot = await create("shallot", { isReviewed: true });
  const chicken = await create("chicken", {
    isReviewed: true,
    properties: { create: [{ propertyType: "MEAT" }] },
  });
  return {
    shallot,
    chicken,
    garlic: await create("garlic", {
      isReviewed: true,
      aliases: { create: [{ name: "ajo" }] },
      properties: {
        create: [{ propertyType: "VEGAN" }, { propertyType: "VEGETABLE" }],
      },
      category: { connect: { id: category.id } },
      tags: { connect: [{ id: tag.id }] },
      brands: { connect: [{ id: brand.id }] },
      substitutions: { connect: [{ id: shallot }] },
    }),
    chickenThigh: await create("chicken thigh", {
      plural: "chicken thighs",
      parentIngredient: { connect: { id: chicken } },
    }),
    parsley: await create("parsley", { isReviewed: true }),
    pesto: await create("pesto", {
      isReviewed: true,
      isComposedIngredient: true,
    }),
    finelyChoppedParsley: await create("finely chopped parsley"),
    bonelessSkinlessThigh: await create("boneless skinless chicken thigh"),
    secretBlend: await create("grandma secret spice blend"),
  };
}

async function counts() {
  const [
    concepts,
    entries,
    mappings,
    relationships,
    discoveries,
    classifications,
    substitutions,
    products,
    revisions,
  ] = await Promise.all([
    prisma.foodConcept.count(),
    prisma.lexiconEntry.count(),
    prisma.legacyIngredientMapping.count(),
    prisma.foodRelationship.count(),
    prisma.discovery.count(),
    prisma.foodClassification.count(),
    prisma.foodSubstitution.count(),
    prisma.foodProduct.count(),
    prisma.lexiconRevision.count(),
  ]);
  return {
    concepts,
    entries,
    mappings,
    relationships,
    discoveries,
    classifications,
    substitutions,
    products,
    revisions,
  };
}

async function conceptOf(legacyIngredientId: string): Promise<string | null> {
  const mapping = await prisma.legacyIngredientMapping.findUniqueOrThrow({
    where: { legacyIngredientId },
  });
  return mapping.conceptId;
}

describe.skipIf(!hasTestDatabase)("legacy ontology seed (integration)", () => {
  let ids: Awaited<ReturnType<typeof createLegacyIngredients>>;

  beforeEach(async () => {
    await resetDatabase();
    await seedOntologyVocabulary();
    await seedLexiconModifiers(modifierSeed.entries);
    ids = await createLegacyIngredients();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("maps every legacy ingredient and never inserts relationships", async () => {
    const summary = await seedOntologyFromLegacy({ batchSize: 3 });

    expect(summary.legacyIngredients).toBe(9);
    expect(await prisma.legacyIngredientMapping.count()).toBe(9);
    expect(await prisma.foodRelationship.count()).toBe(0);
    expect(summary.revisions).toHaveLength(3);
    expect(summary.mappings).toMatchObject({ MAPPED: 7, NEEDS_REVIEW: 2 });
  });

  it("creates concepts and lexicon entries for simple names", async () => {
    await seedOntologyFromLegacy();

    const garlic = await prisma.foodConcept.findUniqueOrThrow({
      where: { id: (await conceptOf(ids.garlic)) ?? "" },
      include: { entries: true, tags: true },
    });
    expect(garlic.status).toBe("VERIFIED");
    expect(
      garlic.entries
        .map((entry) => [entry.text, entry.kind, entry.status])
        .sort()
    ).toEqual([
      ["ajo", "ALIAS", "ACTIVE"],
      ["garlic", "CANONICAL", "ACTIVE"],
    ]);
    expect(garlic.tags.map((tag) => tag.name)).toEqual(["pantry"]);

    const thigh = await prisma.foodConcept.findUniqueOrThrow({
      where: { id: (await conceptOf(ids.chickenThigh)) ?? "" },
      include: { entries: true },
    });
    expect(thigh.status).toBe("PROPOSED");
    expect(
      thigh.entries
        .map((entry) => [entry.text, entry.kind, entry.status])
        .sort()
    ).toEqual([
      ["chicken thigh", "CANONICAL", "PROPOSED"],
      ["chicken thighs", "PLURAL", "PROPOSED"],
    ]);
  });

  it("reads longer names through the resolver", async () => {
    await seedOntologyFromLegacy();

    const modifierComposed =
      await prisma.legacyIngredientMapping.findUniqueOrThrow({
        where: { legacyIngredientId: ids.finelyChoppedParsley },
      });
    expect(modifierComposed).toMatchObject({
      status: "NEEDS_REVIEW",
      note: "modifier-composed",
      conceptId: await conceptOf(ids.parsley),
    });

    const attributeComposed =
      await prisma.legacyIngredientMapping.findUniqueOrThrow({
        where: { legacyIngredientId: ids.bonelessSkinlessThigh },
      });
    expect(attributeComposed).toMatchObject({
      status: "NEEDS_REVIEW",
      note: "attribute-composed",
    });
    const identity = await prisma.discovery.findFirstOrThrow({
      where: { type: "IDENTITY_DECISION" },
    });
    expect(identity.payload).toMatchObject({
      phrase: "boneless skinless chicken thigh",
      headConceptId: await conceptOf(ids.chickenThigh),
    });

    const unknown = await prisma.legacyIngredientMapping.findUniqueOrThrow({
      where: { legacyIngredientId: ids.secretBlend },
    });
    expect(unknown).toMatchObject({ status: "MAPPED", note: "created" });
  });

  it("turns parents into suggestions and copies legacy data", async () => {
    await seedOntologyFromLegacy();
    const garlicId = await conceptOf(ids.garlic);

    const suggestion = await prisma.discovery.findFirstOrThrow({
      where: { type: "RELATIONSHIP_SUGGESTION" },
    });
    expect(suggestion.payload).toMatchObject({
      sourceConceptId: await conceptOf(ids.chickenThigh),
      targetConceptId: await conceptOf(ids.chicken),
      relationshipType: "PART_OF",
    });

    const classifications = await prisma.foodClassification.findMany({
      where: { conceptId: garlicId ?? "" },
      orderBy: { key: "asc" },
    });
    expect(
      classifications.map((row) => [row.kind, row.key, row.value, row.source])
    ).toEqual([
      ["CATEGORY", "CATEGORY:Alliums", "TRUE", "LEGACY"],
      ["DIETARY", "VEGAN", "TRUE", "LEGACY"],
      ["FOOD_GROUP", "VEGETABLE", "TRUE", "LEGACY"],
    ]);
    expect(
      await prisma.foodSubstitution.findFirst({
        where: {
          fromConceptId: garlicId ?? "",
          toConceptId: (await conceptOf(ids.shallot)) ?? "",
        },
      })
    ).not.toBeNull();
    expect(
      await prisma.foodProduct.findFirst({
        where: { name: "garlic", conceptId: garlicId },
      })
    ).not.toBeNull();
    expect(
      (
        await prisma.foodConcept.findUniqueOrThrow({
          where: { id: (await conceptOf(ids.pesto)) ?? "" },
        })
      ).isComposed
    ).toBe(true);
  });

  it("is idempotent: a second run changes nothing", async () => {
    await seedOntologyFromLegacy();
    const before = await counts();

    const again = await seedOntologyFromLegacy();

    expect(await counts()).toEqual(before);
    expect(again).toMatchObject({
      conceptsCreated: 0,
      discoveriesCreated: 0,
      classificationsCreated: 0,
      substitutionsCreated: 0,
      productsCreated: 0,
      revisions: [],
    });
    expect(before.relationships).toBe(0);
  });

  it("dry run reports changes without writing", async () => {
    const before = await counts();

    const summary = await seedOntologyFromLegacy({ dryRun: true });

    expect(summary).toMatchObject({ dryRun: true, legacyIngredients: 9 });
    expect(summary.conceptsCreated).toBeGreaterThan(0);
    expect(await counts()).toEqual(before);
  });

  it("feeds loadResolverSnapshot, and a new verified alias resolves without grammar changes", async () => {
    await seedOntologyFromLegacy();
    const garlicId = await conceptOf(ids.garlic);

    const context = buildResolverContext(await loadResolverSnapshot());
    const [garlic] = processIngredientLine(
      "4 cloves garlic, minced",
      context
    ).mentions;
    expect(garlic?.resolution.candidates[0]?.conceptId).toBe(garlicId);

    const [thighConservative] = processIngredientLine(
      "2 lb chicken thighs",
      context
    ).mentions;
    expect(thighConservative).toMatchObject({
      status: "NEEDS_REVIEW",
      resolution: { candidates: [{ conceptId: await conceptOf(ids.chicken) }] },
    });
    const [thighExploratory] = processIngredientLine(
      "2 lb chicken thighs",
      context,
      { mode: "EXPLORATORY" }
    ).mentions;
    expect(thighExploratory?.resolution.candidates[0]?.conceptId).toBe(
      await conceptOf(ids.chickenThigh)
    );

    const [before] = processIngredientLine(
      "1 head stinking rose",
      context
    ).mentions;
    expect(before?.status).toBe("UNRESOLVED");
    await createLexiconEntries(
      prisma,
      [
        {
          text: "stinking rose",
          role: "FOOD",
          kind: "ALIAS",
          conceptId: garlicId ?? "",
          status: "ACTIVE",
        },
      ],
      1
    );
    const [after] = processIngredientLine(
      "1 head stinking rose",
      buildResolverContext(await loadResolverSnapshot())
    ).mentions;
    expect(after?.resolution.candidates[0]?.conceptId).toBe(garlicId);
  });

  it("computes priorVerifiedShare from verified mentions", async () => {
    await seedOntologyFromLegacy();
    const garlicId = await conceptOf(ids.garlic);
    const context = buildResolverContext(await loadResolverSnapshot());
    const [mention] = processIngredientLine("garlic", context).mentions;
    const parsedLineId = await createLine("garlic", await createNote());

    await prisma.ingredientMention.create({
      data: {
        parsedLineId,
        segmentIndex: 0,
        rawText: "garlic",
        normalizedText: "garlic",
        spanStart: 0,
        spanEnd: 6,
        syntax: {},
        conceptId: garlicId,
        resolution: mention?.resolution ?? {},
        resolutionStatus: "AUTO_RESOLVED",
        parserVersion: "test",
        normalizerVersion: "test",
        resolverVersion: "test",
        lexiconRevision: context.revision,
        verifiedAt: new Date(),
      },
    });

    const snapshot = await loadResolverSnapshot();
    expect(snapshot.priorVerifiedShare).toEqual({
      garlic: { [garlicId ?? ""]: 1 },
    });
  });
});

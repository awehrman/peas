import {
  type SemanticOntology,
  createLine,
  createNote,
  createUser,
  hasTestDatabase,
  resetDatabase,
  seedSemanticOntology,
} from "./int-helpers.js";

import {
  type DecisionPayload,
  type ResolverSnapshot,
  applyDecisionToSnapshot,
  buildResolverContext,
  entryMatchKey,
  processIngredientLine,
} from "@peas/parser/v2";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../../client.js";
import { seedOntologyVocabulary } from "../../../seed/ontology-vocabulary.js";
import { computeAdjacency, refreshDiscoveries } from "../adjacency.js";
import { applyDecision, deferDiscovery } from "../apply-decision.js";
import { backfillMentions, getCorpusCoverage } from "../backfill.js";
import {
  getConceptDecisions,
  getConceptMentions,
  listConcepts,
} from "../concepts.js";
import {
  getDiscoveryCounts,
  getDiscoveryDetail,
  getDiscoveryQueue,
} from "../discoveries.js";
import { OntologyError } from "../helpers.js";
import { MergeConflictError } from "../merge.js";
import { previewDecision, reinterpretAffected } from "../preview.js";
import { loadResolverSnapshot } from "../resolver-context.js";

async function context() {
  return buildResolverContext(await loadResolverSnapshot());
}

async function addLines(
  lines: string[],
  title = "Test note"
): Promise<string[]> {
  const noteId = await createNote(title);
  const ids: string[] = [];
  for (const [index, line] of lines.entries())
    ids.push(await createLine(line, noteId, index));
  return ids;
}

async function mentionOf(
  parsedLineId: string,
  segmentIndex = 0,
  partIndex = 0
) {
  return prisma.ingredientMention.findUniqueOrThrow({
    where: {
      parsedLineId_segmentIndex_partIndex: {
        parsedLineId,
        segmentIndex,
        partIndex,
      },
    },
    include: { attributes: true },
  });
}

/** A snapshot reduced to names and keys, so database rows and in-memory rows compare without their ids. */
function normalize(snapshot: ResolverSnapshot) {
  const conceptName = new Map(
    snapshot.concepts.map((concept) => [concept.id, concept.canonicalName])
  );
  const valueName = new Map(
    snapshot.vocabulary.definitions.flatMap((definition) =>
      definition.values.map(
        (value) => [value.id, `${definition.key}:${value.key}`] as const
      )
    )
  );
  const definitionName = new Map(
    snapshot.vocabulary.definitions.map((definition) => [
      definition.id,
      definition.key,
    ])
  );
  const preparationName = new Map(
    snapshot.vocabulary.preparations.map((preparation) => [
      preparation.id,
      preparation.key,
    ])
  );
  const target = (entry: ResolverSnapshot["entries"][number]) =>
    entry.conceptId
      ? conceptName.get(entry.conceptId)
      : entry.attributeValueId
        ? valueName.get(entry.attributeValueId)
        : entry.preparationId
          ? preparationName.get(entry.preparationId)
          : entry.valueKey;
  return {
    entries: snapshot.entries
      .map(
        (entry) =>
          `${entryMatchKey(entry.text)}|${entry.role}|${target(entry)}|${entry.status ?? "ACTIVE"}`
      )
      .sort(),
    concepts: snapshot.concepts
      .map((concept) => `${concept.canonicalName}|${concept.status}`)
      .sort(),
    relationships: snapshot.relationships
      .map(
        (edge) =>
          `${conceptName.get(edge.sourceId)} ${edge.type} ${conceptName.get(edge.targetId)}`
      )
      .sort(),
    applicability: snapshot.applicability
      .map(
        (row) =>
          `${definitionName.get(row.definitionId)}|${conceptName.get(row.conceptId)}`
      )
      .sort(),
    conceptAttributes: snapshot.conceptAttributes
      .map(
        (row) =>
          `${conceptName.get(row.conceptId)}|${valueName.get(row.attributeValueId)}`
      )
      .sort(),
    vocabulary: snapshot.vocabulary.definitions
      .map(
        (definition) =>
          `${definition.key}:${definition.values
            .map((value) => value.key)
            .sort()
            .join(",")}`
      )
      .sort(),
    priors: Object.entries(snapshot.priorVerifiedShare ?? {})
      .map(
        ([phrase, shares]) =>
          `${phrase}|${Object.entries(shares)
            .map(([id, share]) => `${conceptName.get(id)}=${share}`)
            .sort()
            .join(",")}`
      )
      .sort(),
  };
}

const withPeppers = (
  fixture: Parameters<
    NonNullable<Parameters<typeof seedSemanticOntology>[0]>
  >[0]
) => ({
  ...fixture,
  entries: [
    ...fixture.entries,
    { text: "pepper", role: "FOOD" as const, concept: "black-pepper" },
    { text: "pepper", role: "FOOD" as const, concept: "bell-pepper" },
    {
      text: "organic",
      role: "ATTRIBUTE" as const,
      attribute: "preservation:fresh",
      status: "PROPOSED" as const,
    },
  ],
  ontology: {
    ...fixture.ontology,
    concepts: [
      ...fixture.ontology.concepts,
      "black-pepper",
      "bell-pepper",
      "paprika",
      "smoked-paprika",
    ],
  },
});

describe.skipIf(!hasTestDatabase)("teaching Peas (integration)", () => {
  let ontology: SemanticOntology;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedOntologyVocabulary();
    ontology = await seedSemanticOntology(withPeppers);
    userId = await createUser();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  describe("backfill", () => {
    it("writes mentions and discoveries for every active line, resumes from a checkpoint, and changes nothing when repeated", async () => {
      const [icing, thighs, calamansi, organic, split, inactive] =
        await addLines([
          "2 tbsp icing sugar",
          "1 lb boneless chicken thighs",
          "3 tablespoons calamansi juice",
          "2 cups organic milk",
          "Salt and parsley",
          "1 cup milk",
        ]);
      await prisma.parsedIngredientLine.update({
        where: { id: inactive ?? "" },
        data: { isActive: false },
      });
      const checkpoints: string[] = [];

      const first = await backfillMentions(await context(), {
        batchSize: 2,
        onBatch: ({ checkpoint }) => checkpoints.push(checkpoint),
      });

      expect(first).toMatchObject({
        lines: 5,
        mentionsWritten: 6,
        mentionsChanged: 6,
      });
      expect(checkpoints).toHaveLength(3);
      expect(
        await prisma.ingredientMention.count({
          where: { parsedLineId: inactive ?? "" },
        })
      ).toBe(0);
      expect((await mentionOf(thighs ?? "")).resolutionStatus).toBe(
        "AUTO_RESOLVED"
      );
      expect((await mentionOf(icing ?? "")).resolutionStatus).toBe(
        "UNRESOLVED"
      );
      expect((await mentionOf(calamansi ?? "")).resolutionStatus).toBe(
        "UNRESOLVED"
      );
      expect((await mentionOf(organic ?? "")).resolutionStatus).toBe(
        "NEEDS_REVIEW"
      );
      expect(await mentionOf(split ?? "", 0, 0)).toMatchObject({
        rawText: "Salt",
        partIndex: 0,
        resolutionStatus: "AUTO_RESOLVED",
        conceptId: ontology.concepts.salt,
      });
      expect(await mentionOf(split ?? "", 0, 1)).toMatchObject({
        rawText: "parsley",
        partIndex: 1,
        resolutionStatus: "AUTO_RESOLVED",
        conceptId: ontology.concepts.parsley,
      });

      const discoveries = await prisma.discovery.findMany({
        select: { type: true, key: true, mentionCount: true },
        orderBy: { key: "asc" },
      });
      expect(discoveries).toEqual(
        expect.arrayContaining([
          { type: "UNKNOWN_FOOD_PHRASE", key: "icing sugar", mentionCount: 1 },
          {
            type: "UNKNOWN_FOOD_PHRASE",
            key: "calamansi juice",
            mentionCount: 1,
          },
          { type: "UNKNOWN_MODIFIER", key: "organic", mentionCount: 1 },
          {
            type: "IDENTITY_DECISION",
            key: "boneless chicken thighs",
            mentionCount: 1,
          },
        ])
      );

      const mentionsBefore = await prisma.ingredientMention.findMany({
        orderBy: { id: "asc" },
      });
      const again = await backfillMentions(await context(), { batchSize: 2 });
      expect(again).toMatchObject({ lines: 5, mentionsChanged: 0 });
      expect(
        await prisma.ingredientMention.findMany({ orderBy: { id: "asc" } })
      ).toEqual(mentionsBefore);
      expect(
        await prisma.discovery.findMany({
          select: { type: true, key: true, mentionCount: true },
          orderBy: { key: "asc" },
        })
      ).toEqual(discoveries);

      const resumed = await backfillMentions(await context(), {
        after: checkpoints[1],
      });
      expect(resumed.lines).toBe(1);

      expect(await getCorpusCoverage()).toEqual({
        byStatus: {
          AUTO_RESOLVED: 3,
          NEEDS_REVIEW: 1,
          UNRESOLVED: 2,
          VERIFIED: 0,
        },
        openDiscoveriesByType: {
          IDENTITY_DECISION: 1,
          UNKNOWN_FOOD_PHRASE: 2,
          UNKNOWN_MODIFIER: 1,
        },
      });
    });
  });

  describe("decisions", () => {
    it("scenario A: an alias for powdered sugar is previewed, applied, and reinterprets the affected mention", async () => {
      const [icing, other] = await addLines(
        ["2 tbsp icing sugar", "1 cup milk"],
        "Lemon Bars"
      );
      await backfillMentions(await context());
      const discovery = await prisma.discovery.findUniqueOrThrow({
        where: {
          type_key: { type: "UNKNOWN_FOOD_PHRASE", key: "icing sugar" },
        },
      });
      const payload: DecisionPayload = {
        type: "MAP_TO_CONCEPT",
        phrase: "icing sugar",
        conceptId: ontology.concepts["powdered-sugar"] ?? "",
        kind: "ALIAS",
      };
      const revisionBefore = (await loadResolverSnapshot()).revision;

      const preview = await previewDecision(payload);
      expect(preview.counts).toMatchObject({
        scanned: 1,
        affected: 1,
        newlyResolved: 1,
        conceptChanged: 1,
        verifiedConflicts: 0,
      });
      expect(preview.examples[0]).toMatchObject({
        noteTitle: "Lemon Bars",
        lineText: "2 tbsp icing sugar",
        before: { status: "UNRESOLVED", text: "unresolved: icing sugar" },
        after: { status: "AUTO_RESOLVED", text: "powdered sugar" },
      });
      expect((await loadResolverSnapshot()).revision).toBe(revisionBefore);

      const applied = await applyDecision({
        payload,
        userId,
        discoveryId: discovery.id,
      });
      expect(applied.revision).toBe(revisionBefore + 1);
      expect(applied.effects.created).toHaveLength(1);
      expect(
        await prisma.discovery.findUniqueOrThrow({
          where: { id: discovery.id },
        })
      ).toMatchObject({
        status: "RESOLVED",
        resolvedByDecisionId: applied.decisionId,
      });

      const reinterpreted = await reinterpretAffected(applied.payload);
      expect(reinterpreted).toEqual({
        scope: expect.objectContaining({ phrases: ["icing sugar"] }),
        linesReprocessed: 1,
        mentionsChanged: preview.counts.affected,
        needsBackgroundReinterpret: false,
      });
      expect(await mentionOf(icing ?? "")).toMatchObject({
        resolutionStatus: "AUTO_RESOLVED",
        conceptId: ontology.concepts["powdered-sugar"],
        lexiconRevision: applied.revision,
      });
      expect((await mentionOf(other ?? "")).lexiconRevision).toBe(
        revisionBefore
      );

      await expect(
        applyDecision({ payload, userId, discoveryId: discovery.id })
      ).rejects.toThrow("already decided");
    });

    it("writes the same knowledge as the in-memory preview for every decision type", async () => {
      const [lineId] = await addLines(["1 cup flat-leaf parsley"]);
      await backfillMentions(await context());
      const mention = await mentionOf(lineId ?? "");
      const id = (key: string) => ontology.concepts[key] ?? "";
      const pepperEntryIds = (
        await prisma.lexiconEntry.findMany({
          where: { matchKey: "pepper" },
          select: { id: true },
        })
      ).map((entry) => entry.id);
      const decisions: DecisionPayload[] = [
        {
          type: "MAP_TO_CONCEPT",
          phrase: "pepper",
          conceptId: id("black-pepper"),
          kind: "ALIAS",
          exclusive: true,
        },
        {
          type: "MAP_TO_CONCEPT",
          phrase: "scallion",
          conceptId: id("chicken"),
          kind: "REGIONAL",
        },
        {
          type: "CREATE_CONCEPT",
          canonicalName: "calamansi juice",
          phrase: "calamansi juice",
          relationships: [
            { targetConceptId: id("tomato"), relationshipType: "DERIVED_FROM" },
          ],
          attributeValueIds: [ontology.attributes["form:whole"] ?? ""],
        },
        {
          type: "CONCEPT_PLUS_ATTRIBUTE",
          phrase: "organic milk",
          modifierText: "organic",
          conceptId: id("milk"),
          attributeValueIds: [ontology.attributes["preservation:fresh"] ?? ""],
        },
        {
          type: "CLASSIFY_MODIFIER",
          token: "loosely",
          role: "DEGREE",
          valueKey: "light",
        },
        {
          type: "CLASSIFY_MODIFIER",
          token: "ripe",
          role: "ATTRIBUTE",
          attributeValueId: ontology.attributes["ripeness:ripe"] ?? "",
          applicableConceptIds: [id("apple")],
        },
        {
          type: "ADD_ATTRIBUTE_VALUE",
          definitionId: ontology.definitions["color"] ?? "",
          key: "teal",
          label: "Teal",
          applicableConceptIds: [id("salt")],
        },
        {
          type: "ADD_RELATIONSHIP",
          sourceConceptId: id("smoked-paprika"),
          targetConceptId: id("paprika"),
          relationshipType: "IS_A",
        },
        { type: "IGNORE_TOKEN", token: "good-quality" },
        {
          type: "MERGE_CONCEPTS",
          survivorId: id("mozzarella"),
          mergedId: id("fresh-mozzarella"),
        },
        {
          type: "CORRECT_MENTION",
          mentionId: mention.id,
          conceptId: id("parsley"),
          attributeValueIds: [],
          teachPhrase: "flat-leaf parsley",
        },
        { type: "MARK_AMBIGUOUS", phrase: "pepper", entryIds: pepperEntryIds },
        { type: "REJECT", reason: "Not an ingredient" },
      ];

      for (const payload of decisions) {
        const before = await loadResolverSnapshot();
        const expected = applyDecisionToSnapshot(before, payload);
        await applyDecision({ payload, userId });
        const actual = await loadResolverSnapshot();
        // A correction's verified-choice prior depends on the stored mention, which the in-memory mirror does not model.
        const priors = payload.type === "CORRECT_MENTION" ? { priors: [] } : {};
        expect({ type: payload.type, ...normalize(actual), ...priors }).toEqual(
          {
            type: payload.type,
            ...normalize(expected),
            ...priors,
          }
        );
        expect(actual.revision).toBe(expected.revision);
      }
      expect(
        await prisma.foodRelationship.count({
          where: { sourceId: id("fresh-mozzarella") },
        })
      ).toBe(0);
    });

    it("reverts a decision's entries, deprecations, and applicability, and reopens its discovery", async () => {
      const original = normalize(await loadResolverSnapshot());
      await addLines(["1 pepper"]);
      await backfillMentions(await context());
      const discovery = await prisma.discovery.findUniqueOrThrow({
        where: { type_key: { type: "AMBIGUOUS_MATCH", key: "pepper" } },
      });
      const exclusive = await applyDecision({
        payload: {
          type: "MAP_TO_CONCEPT",
          phrase: "pepper",
          conceptId: ontology.concepts["black-pepper"] ?? "",
          kind: "ALIAS",
          exclusive: true,
        },
        userId,
        discoveryId: discovery.id,
      });
      expect(exclusive.effects.deprecated).toHaveLength(1);
      const attribute = await applyDecision({
        payload: {
          type: "CONCEPT_PLUS_ATTRIBUTE",
          phrase: "organic milk",
          modifierText: "organic",
          conceptId: ontology.concepts.milk ?? "",
          attributeValueIds: [ontology.attributes["preservation:fresh"] ?? ""],
        },
        userId,
      });
      expect(attribute.effects.updated).toEqual([
        expect.objectContaining({
          table: "LexiconEntry",
          previous: "PROPOSED",
        }),
      ]);
      expect(attribute.effects.applicabilityAdded).toHaveLength(1);

      await applyDecision({
        payload: { type: "REVERT", decisionId: attribute.decisionId },
        userId,
      });
      await applyDecision({
        payload: { type: "REVERT", decisionId: exclusive.decisionId },
        userId,
      });

      expect(normalize(await loadResolverSnapshot())).toEqual(original);
      expect(
        await prisma.lexiconDecision.findUniqueOrThrow({
          where: { id: exclusive.decisionId },
        })
      ).toMatchObject({ revertedById: expect.any(String) });
      expect(
        (
          await prisma.discovery.findUniqueOrThrow({
            where: { id: discovery.id },
          })
        ).status
      ).toBe("OPEN");
      await expect(
        applyDecision({
          payload: { type: "REVERT", decisionId: exclusive.decisionId },
          userId,
        })
      ).rejects.toThrow("already reverted");
    });

    it("previews a revert without changing anything", async () => {
      await addLines(["2 tbsp icing sugar"]);
      await backfillMentions(await context());
      const applied = await applyDecision({
        payload: {
          type: "MAP_TO_CONCEPT",
          phrase: "icing sugar",
          conceptId: ontology.concepts["powdered-sugar"] ?? "",
          kind: "ALIAS",
        },
        userId,
      });
      await reinterpretAffected(applied.payload);
      const revisions = await prisma.lexiconRevision.count();

      const preview = await previewDecision(
        { type: "REVERT", decisionId: applied.decisionId },
        { userId }
      );

      expect(preview.counts).toMatchObject({
        affected: 1,
        becameUnresolved: 1,
      });
      expect(await prisma.lexiconRevision.count()).toBe(revisions);
      expect(
        await prisma.lexiconDecision.findUniqueOrThrow({
          where: { id: applied.decisionId },
        })
      ).toMatchObject({ revertedById: null });
      await expect(
        previewDecision({ type: "REVERT", decisionId: applied.decisionId })
      ).rejects.toThrow(OntologyError);
    });

    it("scenario E: a corrected mention is verified and a repeated backfill leaves it alone", async () => {
      const [lineId] = await addLines(["2 cups organic milk"]);
      await backfillMentions(await context());
      const mention = await mentionOf(lineId ?? "");

      await applyDecision({
        payload: {
          type: "CORRECT_MENTION",
          mentionId: mention.id,
          conceptId: ontology.concepts["whole-milk"] ?? "",
          attributeValueIds: [ontology.attributes["fat_content:whole"] ?? ""],
        },
        userId,
      });
      const corrected = await mentionOf(lineId ?? "");
      expect(corrected).toMatchObject({
        resolutionStatus: "VERIFIED",
        conceptId: ontology.concepts["whole-milk"],
        verifiedById: userId,
      });

      const rerun = await backfillMentions(await context());
      expect(rerun).toMatchObject({ protectedMentions: 1, mentionsChanged: 0 });
      expect(await mentionOf(lineId ?? "")).toEqual(corrected);
      expect(
        await prisma.discovery.count({ where: { type: "VERIFIED_DRIFT" } })
      ).toBe(1);
    });
  });

  describe("merge", () => {
    it("moves every reference to the survivor, then puts everything back on revert", async () => {
      const survivor = ontology.concepts.mozzarella ?? "";
      const merged = ontology.concepts["fresh-mozzarella"] ?? "";
      const [lineId] = await addLines(["1 cup fresh mozzarella"]);
      await backfillMentions(await context());
      const mention = await mentionOf(lineId ?? "");
      await prisma.ingredientMention.update({
        where: { id: mention.id },
        data: { verifiedAt: new Date(), resolutionStatus: "VERIFIED" },
      });
      await prisma.foodClassification.createMany({
        data: [
          {
            conceptId: merged,
            kind: "FOOD_GROUP",
            key: "DAIRY",
            value: "TRUE",
          },
          {
            conceptId: survivor,
            kind: "FOOD_GROUP",
            key: "DAIRY",
            value: "TRUE",
          },
          {
            conceptId: merged,
            kind: "ALLERGEN",
            key: "ALLERGEN_MILK",
            value: "TRUE",
          },
        ],
      });
      const tag = await prisma.ingredientTag.create({
        data: { name: "cheese", concepts: { connect: [{ id: merged }] } },
      });
      const brand = await prisma.brand.create({ data: { name: "BelGioioso" } });
      await prisma.foodProduct.create({
        data: {
          name: "fresh mozzarella",
          brandId: brand.id,
          conceptId: merged,
        },
      });
      await prisma.foodSubstitution.create({
        data: {
          fromConceptId: merged,
          toConceptId: ontology.concepts.milk ?? "",
        },
      });
      await prisma.legacyIngredientMapping.create({
        data: {
          legacyIngredientId: "legacy-mozz",
          conceptId: merged,
          status: "MAPPED",
        },
      });
      const entryCount = await prisma.lexiconEntry.count();
      const before = normalize(await loadResolverSnapshot());

      const applied = await applyDecision({
        payload: {
          type: "MERGE_CONCEPTS",
          survivorId: survivor,
          mergedId: merged,
        },
        userId,
      });

      expect(
        await prisma.foodConcept.findUniqueOrThrow({ where: { id: merged } })
      ).toMatchObject({ status: "DEPRECATED", mergedIntoId: survivor });
      expect(await prisma.lexiconEntry.count()).toBe(entryCount);
      expect(
        await prisma.lexiconEntry.count({
          where: { conceptId: merged, status: { not: "DEPRECATED" } },
        })
      ).toBe(0);
      expect(
        await prisma.foodRelationship.count({
          where: { OR: [{ sourceId: merged }, { targetId: merged }] },
        })
      ).toBe(0);
      expect(
        await prisma.foodClassification.findMany({
          where: { conceptId: survivor },
          select: { key: true },
          orderBy: { key: "asc" },
        })
      ).toEqual([{ key: "ALLERGEN_MILK" }, { key: "DAIRY" }]);
      expect((await mentionOf(lineId ?? "")).conceptId).toBe(survivor);
      expect(
        await prisma.foodProduct.count({ where: { conceptId: survivor } })
      ).toBe(1);
      expect(
        await prisma.foodSubstitution.count({
          where: { fromConceptId: survivor },
        })
      ).toBe(1);
      expect(
        await prisma.legacyIngredientMapping.findUniqueOrThrow({
          where: { legacyIngredientId: "legacy-mozz" },
        })
      ).toMatchObject({ conceptId: survivor });
      expect(
        await prisma.foodConcept.findUniqueOrThrow({
          where: { id: survivor },
          select: { tags: { select: { id: true } } },
        })
      ).toEqual({ tags: [{ id: tag.id }] });

      await applyDecision({
        payload: { type: "REVERT", decisionId: applied.decisionId },
        userId,
      });

      expect(normalize(await loadResolverSnapshot())).toEqual(before);
      expect(
        await prisma.foodConcept.findUniqueOrThrow({ where: { id: merged } })
      ).toMatchObject({ status: "VERIFIED", mergedIntoId: null });
      expect((await mentionOf(lineId ?? "")).conceptId).toBe(merged);
      expect(
        await prisma.foodClassification.count({ where: { conceptId: merged } })
      ).toBe(2);
      expect(
        await prisma.foodProduct.count({ where: { conceptId: merged } })
      ).toBe(1);
      expect(
        await prisma.foodSubstitution.count({
          where: { fromConceptId: merged },
        })
      ).toBe(1);
      expect(
        await prisma.foodConcept.findUniqueOrThrow({
          where: { id: survivor },
          select: { tags: true },
        })
      ).toEqual({ tags: [] });
    });

    it("aborts on contradicting classifications without changing anything", async () => {
      const survivor = ontology.concepts.milk ?? "";
      const merged = ontology.concepts["whole-milk"] ?? "";
      await prisma.foodClassification.createMany({
        data: [
          {
            conceptId: survivor,
            kind: "DIETARY",
            key: "VEGAN",
            value: "FALSE",
          },
          { conceptId: merged, kind: "DIETARY", key: "VEGAN", value: "TRUE" },
        ],
      });
      const revisions = await prisma.lexiconRevision.count();

      const error = await applyDecision({
        payload: {
          type: "MERGE_CONCEPTS",
          survivorId: survivor,
          mergedId: merged,
        },
        userId,
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(MergeConflictError);
      expect((error as MergeConflictError).conflicts).toEqual([
        { key: "VEGAN", survivorValue: "FALSE", mergedValue: "TRUE" },
      ]);
      expect(await prisma.lexiconRevision.count()).toBe(revisions);
      expect(
        (await prisma.foodConcept.findUniqueOrThrow({ where: { id: merged } }))
          .status
      ).toBe("VERIFIED");
    });
  });

  describe("review queue", () => {
    it("defers discoveries and only shows identity questions with enough notes behind them", async () => {
      await addLines(["2 green apples"], "Pie");
      await backfillMentions(await context());
      expect(
        (await getDiscoveryQueue()).items.map((item) => item.key)
      ).not.toContain("green apples");

      await addLines(["3 green apples"], "Crumble");
      await backfillMentions(await context());
      const queue = await getDiscoveryQueue();
      expect(queue.items.map((item) => item.key)).toContain("green apples");
      expect(await getDiscoveryCounts()).toMatchObject({
        IDENTITY_DECISION: 1,
      });

      const identity = queue.items.find((item) => item.key === "green apples");
      const detail = await getDiscoveryDetail(identity?.id ?? "", {
        exampleLimit: 1,
        exampleOffset: 1,
      });
      expect(detail?.examples).toEqual([
        expect.objectContaining({
          noteTitle: expect.stringMatching(/Pie|Crumble/),
        }),
      ]);

      await deferDiscovery(identity?.id ?? "");
      expect(
        (await getDiscoveryQueue()).items.map((item) => item.key)
      ).not.toContain("green apples");
      await expect(deferDiscovery(identity?.id ?? "")).rejects.toThrow(
        "Only open discoveries"
      );
    });

    it("mines adjacency into identity and modifier discoveries and suggests relationships by name", async () => {
      await addLines(
        ["1 lb boneless chicken thighs", "2 cups organic milk"],
        "One"
      );
      await addLines(
        ["2 lb boneless chicken thighs", "1 cup organic milk"],
        "Two"
      );
      await backfillMentions(await context());

      const adjacency = await computeAdjacency({ minNotes: 2 });
      expect(adjacency).toEqual(
        expect.arrayContaining([
          {
            conceptId: ontology.concepts["chicken-thigh"],
            token: "boneless",
            role: "ATTRIBUTE",
            distinctNotes: 2,
          },
          {
            conceptId: ontology.concepts.milk,
            token: "organic",
            role: "UNKNOWN",
            distinctNotes: 2,
          },
        ])
      );

      const refreshed = await prisma.$transaction(async (tx) =>
        refreshDiscoveries(
          tx,
          buildResolverContext(await loadResolverSnapshot(tx))
        )
      );
      expect(refreshed).toEqual({
        identityUpdated: 1,
        modifiersUpdated: 1,
        relationshipSuggestions: 1,
      });
      const identity = await prisma.discovery.findUniqueOrThrow({
        where: {
          type_key: {
            type: "IDENTITY_DECISION",
            key: "boneless chicken thighs",
          },
        },
      });
      expect(identity.payload).toMatchObject({ cooccurrence: 2 });
      const modifier = await prisma.discovery.findUniqueOrThrow({
        where: { type_key: { type: "UNKNOWN_MODIFIER", key: "organic" } },
      });
      expect(modifier.payload).toMatchObject({
        adjacentHeads: [
          { conceptId: ontology.concepts.milk, distinctNotes: 2 },
        ],
      });
      expect(
        await prisma.discovery.findFirstOrThrow({
          where: { type: "RELATIONSHIP_SUGGESTION" },
        })
      ).toMatchObject({
        payload: expect.objectContaining({
          sourceConceptId: ontology.concepts["smoked-paprika"],
          targetConceptId: ontology.concepts.paprika,
        }),
      });

      const second = await prisma.$transaction(async (tx) =>
        refreshDiscoveries(
          tx,
          buildResolverContext(await loadResolverSnapshot(tx))
        )
      );
      expect(second).toEqual({
        identityUpdated: 0,
        modifiersUpdated: 0,
        relationshipSuggestions: 0,
      });
    });
  });

  describe("concept pages", () => {
    it("lists concepts with counts, example mentions, and linked decisions", async () => {
      await addLines(["2 tbsp powdered sugar"], "Lemon Bars");
      await backfillMentions(await context());
      const conceptId = ontology.concepts["powdered-sugar"] ?? "";
      const applied = await applyDecision({
        payload: {
          type: "MAP_TO_CONCEPT",
          phrase: "icing sugar",
          conceptId,
          kind: "ALIAS",
        },
        userId,
      });

      expect(await listConcepts({ query: "icing" })).toEqual({
        items: [
          expect.objectContaining({
            canonicalName: "powdered sugar",
            entryCount: 3,
            mentionCount: 1,
          }),
        ],
        total: 1,
      });
      expect(await getConceptMentions(conceptId)).toEqual([
        expect.objectContaining({
          lineText: "2 tbsp powdered sugar",
          noteTitle: "Lemon Bars",
          verified: false,
        }),
      ]);
      expect(await getConceptDecisions(conceptId)).toEqual([
        expect.objectContaining({
          id: applied.decisionId,
          type: "MAP_TO_CONCEPT",
          username: "reviewer",
          canRevert: true,
        }),
      ]);
      expect(
        processIngredientLine("2 tbsp icing sugar", await context()).mentions[0]
          ?.status
      ).toBe("AUTO_RESOLVED");
    });
  });
});

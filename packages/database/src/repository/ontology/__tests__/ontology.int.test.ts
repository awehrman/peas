import {
  createLine,
  createNote,
  createUser,
  hasTestDatabase,
  resetDatabase,
} from "./int-helpers.js";

import {
  type Resolution,
  buildLexicon,
  parseLineBest,
  priorityForDiscovery,
} from "@peas/parser/v2";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../../client.js";
import { seedOntologyVocabulary } from "../../../seed/ontology-vocabulary.js";
import { getAttributeVocabulary } from "../attributes.js";
import {
  getEffectiveClassifications,
  setClassification,
} from "../classifications.js";
import {
  createConcept,
  getConceptDetail,
  searchConcepts,
} from "../concepts.js";
import { recordDecision } from "../decisions.js";
import {
  getDiscoveryDetail,
  getDiscoveryQueue,
  upsertDiscoveries,
} from "../discoveries.js";
import { OntologyError, isUniqueViolation } from "../helpers.js";
import { getLegacyMapping, upsertLegacyMapping } from "../legacy-mapping.js";
import {
  createLexiconEntries,
  deprecateLexiconEntries,
  getLexiconSnapshot,
} from "../lexicon.js";
import {
  findMentionsByText,
  getMentionDetail,
  getMentionsForLine,
  markMentionVerified,
  upsertMentionsForLine,
} from "../mentions.js";
import {
  addRelationship,
  getAncestors,
  getDescendants,
} from "../relationships.js";
import { bumpRevision, getCurrentRevision } from "../revision.js";

async function concept(name: string): Promise<string> {
  return prisma.$transaction(
    async (tx) =>
      (await createConcept(tx, { canonicalName: name, status: "VERIFIED" })).id
  );
}

function resolutionFor(
  conceptId: string | null,
  unresolved: Resolution["unresolved"] = []
): Resolution {
  return {
    resolverVersion: "test",
    candidates: conceptId
      ? [
          {
            conceptId,
            entryId: null,
            score: 0.9,
            reasons: ["TEST"],
            attributes: [],
            preparations: [],
            modifiers: [],
            unresolved: [],
          },
        ]
      : [],
    unresolved,
  };
}

describe.skipIf(!hasTestDatabase)("ontology repositories (integration)", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  describe("vocabulary seed", () => {
    it("runs twice without creating duplicates and bumps the revision once", async () => {
      const first = await seedOntologyVocabulary();
      const second = await seedOntologyVocabulary();
      expect(first).toMatchObject({
        definitionsAdded: 11,
        preparationsAdded: 27,
        revision: 1,
      });
      expect(second).toEqual({
        definitionsAdded: 0,
        valuesAdded: 0,
        preparationsAdded: 0,
        revision: null,
      });
      expect(await getCurrentRevision()).toBe(1);
      const vocabulary = await getAttributeVocabulary();
      expect(
        vocabulary.definitions
          .find((definition) => definition.key === "bone")
          ?.values.map((value) => value.key)
      ).toEqual(["bone_in", "boneless"]);
    });
  });

  describe("concepts", () => {
    it("gives colliding names numbered slugs and finds concepts by entry text", async () => {
      const [first, second] = await prisma.$transaction(async (tx) => [
        await createConcept(tx, { canonicalName: "Apple" }),
        await createConcept(tx, { canonicalName: "apple" }),
      ]);
      expect(first?.slug).toBe("apple");
      expect(second?.slug).toBe("apple-2");

      const scallion = await concept("scallion");
      await prisma.$transaction(async (tx) => {
        const revision = await bumpRevision(tx, "test");
        await createLexiconEntries(
          tx,
          [
            {
              text: "green onion",
              role: "FOOD",
              kind: "REGIONAL",
              conceptId: scallion,
              status: "ACTIVE",
            },
          ],
          revision
        );
      });
      expect(
        (await searchConcepts("green onion")).map((result) => result.id)
      ).toEqual([scallion]);
    });
  });

  describe("relationships", () => {
    it("rejects IS_A and PART_OF cycles but allows non-hierarchical back-edges", async () => {
      const [thigh, chicken, poultry] = [
        await concept("chicken thigh"),
        await concept("chicken"),
        await concept("poultry"),
      ];
      await prisma.$transaction(async (tx) => {
        await addRelationship(tx, {
          sourceId: thigh,
          targetId: chicken,
          type: "PART_OF",
        });
        await addRelationship(tx, {
          sourceId: chicken,
          targetId: poultry,
          type: "IS_A",
        });
      });

      await expect(
        prisma.$transaction((tx) =>
          addRelationship(tx, {
            sourceId: poultry,
            targetId: thigh,
            type: "IS_A",
          })
        )
      ).rejects.toThrow(/cycle/);
      await expect(
        prisma.$transaction((tx) =>
          addRelationship(tx, {
            sourceId: chicken,
            targetId: chicken,
            type: "PART_OF",
          })
        )
      ).rejects.toThrow(OntologyError);
      await expect(
        prisma.$transaction((tx) =>
          addRelationship(tx, {
            sourceId: poultry,
            targetId: thigh,
            type: "DERIVED_FROM",
          })
        )
      ).resolves.toHaveProperty("id");

      expect(
        (await getAncestors(thigh)).map(({ canonicalName, path }) => ({
          canonicalName,
          path,
        }))
      ).toEqual([
        { canonicalName: "chicken", path: ["PART_OF"] },
        { canonicalName: "poultry", path: ["PART_OF", "IS_A"] },
      ]);
      expect(
        (await getDescendants(poultry)).map((related) => related.canonicalName)
      ).toEqual(["chicken", "chicken thigh"]);
    });

    it("rejects a duplicate edge", async () => {
      const [apple, fruit] = [await concept("apple"), await concept("fruit")];
      await prisma.$transaction((tx) =>
        addRelationship(tx, { sourceId: apple, targetId: fruit, type: "IS_A" })
      );
      await expect(
        prisma.$transaction((tx) =>
          addRelationship(tx, {
            sourceId: apple,
            targetId: fruit,
            type: "IS_A",
          })
        )
      ).rejects.toThrow(/already exists/);
    });
  });

  describe("classifications", () => {
    it("inherits by relationship type and lets explicit values win", async () => {
      const [milk, buttermilk] = [
        await concept("milk"),
        await concept("buttermilk"),
      ];
      await prisma.$transaction(async (tx) => {
        await addRelationship(tx, {
          sourceId: buttermilk,
          targetId: milk,
          type: "DERIVED_FROM",
        });
        await setClassification(tx, {
          conceptId: milk,
          kind: "FOOD_GROUP",
          key: "DAIRY",
          value: "TRUE",
        });
        await setClassification(tx, {
          conceptId: milk,
          kind: "ALLERGEN",
          key: "ALLERGEN_MILK",
          value: "TRUE",
        });
      });

      expect(
        (await getEffectiveClassifications(buttermilk)).map(
          ({ key, source }) => ({ key, source })
        )
      ).toEqual([{ key: "ALLERGEN_MILK", source: "INHERITED" }]);

      await prisma.$transaction((tx) =>
        setClassification(tx, {
          conceptId: buttermilk,
          kind: "ALLERGEN",
          key: "ALLERGEN_MILK",
          value: "FALSE",
        })
      );
      const detail = await getConceptDetail(buttermilk);
      expect(detail?.classifications).toEqual([
        {
          kind: "ALLERGEN",
          key: "ALLERGEN_MILK",
          value: "FALSE",
          source: "EXPLICIT",
        },
      ]);
      expect(detail?.parents.map((parent) => parent.canonicalName)).toEqual([
        "milk",
      ]);
    });
  });

  describe("lexicon", () => {
    it("deduplicates on (matchKey, targetKey) and keeps same-text entries for different targets", async () => {
      const [milk, wholeMilk] = [
        await concept("milk"),
        await concept("whole milk"),
      ];
      const results = await prisma.$transaction(async (tx) => {
        const revision = await bumpRevision(tx, "test");
        return createLexiconEntries(
          tx,
          [
            {
              text: "Whole Milk",
              role: "FOOD",
              kind: "CANONICAL",
              conceptId: wholeMilk,
              status: "ACTIVE",
            },
            {
              text: "whole  milk",
              role: "FOOD",
              kind: "CANONICAL",
              conceptId: wholeMilk,
              status: "ACTIVE",
            },
            {
              text: "whole milk",
              role: "FOOD",
              kind: "ALIAS",
              conceptId: milk,
              status: "ACTIVE",
            },
          ],
          revision
        );
      });
      expect(results.map((result) => result.created)).toEqual([
        true,
        false,
        true,
      ]);
      expect(results[1]?.id).toBe(results[0]?.id);
      expect(results[2]?.id).not.toBe(results[0]?.id);

      const duplicate = await prisma.lexiconEntry
        .create({
          data: {
            text: "WHOLE MILK",
            normalized: "WHOLE MILK",
            matchKey: "whole milk",
            tokenCount: 2,
            role: "FOOD",
            conceptId: wholeMilk,
            targetKey: `food:${wholeMilk}`,
            normalizerVersion: "1.0.0",
            revisionAdded: 1,
          },
        })
        .catch((error: unknown) => error);
      expect(isUniqueViolation(duplicate)).toBe(true);
    });

    it("enforces the role/target CHECK constraint in the database", async () => {
      await bumpRevision(prisma, "test");
      await expect(
        prisma.lexiconEntry.create({
          data: {
            text: "finely",
            normalized: "finely",
            matchKey: "finely",
            tokenCount: 1,
            role: "FOOD",
            valueKey: "fine",
            targetKey: "food:missing",
            normalizerVersion: "1.0.0",
            revisionAdded: 1,
          },
        })
      ).rejects.toThrow();
    });

    it("builds snapshots the parser accepts, hiding proposed and deprecated entries", async () => {
      const garlic = await concept("garlic");
      const [active, proposed] = await prisma.$transaction(async (tx) => {
        const revision = await bumpRevision(tx, "test");
        return createLexiconEntries(
          tx,
          [
            {
              text: "garlic",
              role: "FOOD",
              kind: "CANONICAL",
              conceptId: garlic,
              status: "ACTIVE",
            },
            {
              text: "garlic cloves",
              role: "FOOD",
              kind: "VARIANT",
              conceptId: garlic,
              status: "PROPOSED",
            },
            {
              text: "finely",
              role: "DEGREE",
              valueKey: "fine",
              status: "ACTIVE",
            },
          ],
          revision
        );
      });

      const conservative = await getLexiconSnapshot();
      expect(conservative.entries.map((entry) => entry.text).sort()).toEqual([
        "finely",
        "garlic",
      ]);
      const exploratory = await getLexiconSnapshot({ includeProposed: true });
      expect(exploratory.entries).toHaveLength(3);

      const tree = parseLineBest("2 garlic cloves, finely minced", {
        lexicon: buildLexicon(conservative),
      });
      expect(tree.lexiconRevision).toBe(conservative.revision);

      await prisma.$transaction(async (tx) =>
        deprecateLexiconEntries(
          tx,
          [active!.id, proposed!.id],
          await bumpRevision(tx, "test")
        )
      );
      expect(
        (await getLexiconSnapshot({ includeProposed: true })).entries.map(
          (entry) => entry.text
        )
      ).toEqual(["finely"]);
    });
  });

  describe("mentions", () => {
    it("is idempotent, removes vanished segments, and protects verified mentions", async () => {
      const [butter, oliveOil, shallot] = [
        await concept("butter"),
        await concept("olive oil"),
        await concept("shallot"),
      ];
      const noteId = await createNote();
      const lineId = await createLine(
        "1 tbsp butter and 2 tbsp olive oil",
        noteId
      );
      const userId = await createUser();
      const line = parseLineBest("1 tbsp butter and 2 tbsp olive oil");
      expect(line.segments).toHaveLength(2);

      const inputs = [
        {
          line,
          segmentIndex: 0,
          resolution: resolutionFor(butter),
          resolutionStatus: "AUTO_RESOLVED" as const,
        },
        {
          line,
          segmentIndex: 1,
          resolution: resolutionFor(oliveOil),
          resolutionStatus: "AUTO_RESOLVED" as const,
        },
      ];
      const first = await prisma.$transaction((tx) =>
        upsertMentionsForLine(tx, lineId, inputs)
      );
      const second = await prisma.$transaction((tx) =>
        upsertMentionsForLine(tx, lineId, inputs)
      );
      expect(second.mentionIds).toEqual(first.mentionIds);
      expect(await prisma.ingredientMention.count()).toBe(2);

      const [butterMention] = first.mentionIds;
      await prisma.$transaction((tx) =>
        markMentionVerified(tx, butterMention!, userId, { conceptId: shallot })
      );

      const reparse = await prisma.$transaction((tx) =>
        upsertMentionsForLine(tx, lineId, inputs)
      );
      expect(reparse.protectedIds).toEqual([butterMention]);
      expect(reparse.driftDiscoveryIds).toHaveLength(1);
      const mentions = await getMentionsForLine(lineId);
      expect(mentions.map((mention) => mention.conceptName)).toEqual([
        "shallot",
        "olive oil",
      ]);
      expect(mentions[0]?.resolutionStatus).toBe("VERIFIED");

      await prisma.$transaction((tx) =>
        upsertMentionsForLine(tx, lineId, inputs)
      );
      const drift = await getDiscoveryQueue({ type: "VERIFIED_DRIFT" });
      expect(drift.items).toHaveLength(1);
      expect(drift.items[0]).toMatchObject({
        mentionCount: 1,
        distinctNoteCount: 1,
      });

      const shrink = await prisma.$transaction((tx) =>
        upsertMentionsForLine(tx, lineId, [inputs[0]!])
      );
      expect(shrink.removedCount).toBe(1);
      expect(shrink.protectedIds).toEqual([butterMention]);
      expect(await prisma.ingredientMention.count()).toBe(1);

      const detail = await getMentionDetail(butterMention!);
      expect(detail?.syntax.line.segmentCount).toBe(2);
      expect(detail?.quantity).toMatchObject({ kind: "EXACT" });
    });

    it("finds mentions by substring and by trigram similarity", async () => {
      const noteId = await createNote();
      const texts = [
        "2 tbsp olive oil",
        "1/4 cup extra-virgin olive oil",
        "1 cup sugar",
      ];
      for (const [index, text] of texts.entries()) {
        const lineId = await createLine(text, noteId, index);
        await prisma.$transaction((tx) =>
          upsertMentionsForLine(tx, lineId, [
            {
              line: parseLineBest(text),
              segmentIndex: 0,
              resolution: resolutionFor(null),
              resolutionStatus: "UNRESOLVED",
            },
          ])
        );
      }

      expect(
        (await findMentionsByText("olive oil"))
          .map((match) => match.rawText)
          .sort()
      ).toEqual(["1/4 cup extra-virgin olive oil", "2 tbsp olive oil"]);
      expect(
        (await findMentionsByText("2 tbsp olive oyl")).map(
          (match) => match.rawText
        )
      ).toContain("2 tbsp olive oil");
      expect(await findMentionsByText("saffron")).toEqual([]);
    });
  });

  describe("discoveries and decisions", () => {
    it("counts evidence across notes, ranks the queue, and resolves on decision", async () => {
      const [noteA, noteB] = [await createNote("A"), await createNote("B")];
      const mentionIds: string[] = [];
      for (const [index, noteId] of [noteA, noteA, noteB].entries()) {
        const text = "3 tablespoons calamansi juice";
        const lineId = await createLine(text, noteId, index);
        const result = await prisma.$transaction((tx) =>
          upsertMentionsForLine(tx, lineId, [
            {
              line: parseLineBest(text),
              segmentIndex: 0,
              resolution: resolutionFor(null),
              resolutionStatus: "UNRESOLVED",
            },
          ])
        );
        mentionIds.push(result.mentionIds[0]!);
      }

      const candidate = {
        key: "calamansi juice",
        payload: {
          type: "UNKNOWN_FOOD_PHRASE" as const,
          phrase: "calamansi juice",
          headToken: "juice",
        },
        evidence: mentionIds.map((mentionId, index) => ({
          mentionId,
          noteId: index < 2 ? noteA : noteB,
          spanStart: 14,
          spanEnd: 29,
        })),
      };
      const lowPriority = {
        key: "QTY PHRASE",
        payload: {
          type: "STRUCTURAL_PATTERN" as const,
          signature: "QTY PHRASE",
          example: "3 eggs",
        },
        evidence: [
          {
            mentionId: mentionIds[0]!,
            noteId: noteA,
            spanStart: 0,
            spanEnd: 1,
          },
        ],
      };
      const [discoveryId] = await prisma.$transaction((tx) =>
        upsertDiscoveries(tx, [candidate, lowPriority], 1)
      );
      await prisma.$transaction((tx) => upsertDiscoveries(tx, [candidate], 2));

      const queue = await getDiscoveryQueue({ limit: 1 });
      expect(queue.items[0]).toMatchObject({
        id: discoveryId,
        mentionCount: 3,
        distinctNoteCount: 2,
        priority: priorityForDiscovery("UNKNOWN_FOOD_PHRASE", {
          distinctNotes: 2,
          mentions: 3,
        }),
      });
      const next = await getDiscoveryQueue({
        limit: 1,
        cursor: queue.nextCursor,
      });
      expect(next.items[0]?.key).toBe("QTY PHRASE");
      expect(next.nextCursor).toBeNull();

      const detail = await getDiscoveryDetail(discoveryId!, {
        exampleLimit: 2,
      });
      expect(detail?.examples).toHaveLength(2);
      expect(detail).toMatchObject({
        firstSeenRevision: 1,
        lastSeenRevision: 2,
      });

      const userId = await createUser();
      const decision = await prisma.$transaction((tx) =>
        recordDecision(tx, {
          payload: { type: "REJECT", reason: "Not common enough yet" },
          userId,
          discoveryId,
        })
      );
      const revision = await prisma.lexiconRevision.findUnique({
        where: { id: decision.revision },
      });
      expect(revision?.reason).toBe(`decision:${decision.id}`);
      expect((await getDiscoveryDetail(discoveryId!))?.status).toBe("REJECTED");
      expect((await getDiscoveryQueue()).items.map((item) => item.key)).toEqual(
        ["QTY PHRASE"]
      );
    });

    it("rejects invalid payloads before writing", async () => {
      const userId = await createUser();
      await expect(
        prisma.$transaction((tx) =>
          recordDecision(tx, {
            payload: {
              type: "MERGE_CONCEPTS",
              survivorId: "not-a-uuid",
              mergedId: "also-not",
            },
            userId,
          })
        )
      ).rejects.toThrow(/Invalid LexiconDecision.payload/);
      expect(await prisma.lexiconDecision.count()).toBe(0);
    });
  });

  describe("legacy mapping", () => {
    it("stamps migratedAt once when mapped", async () => {
      const garlic = await concept("garlic");
      const first = await prisma.$transaction((tx) =>
        upsertLegacyMapping(tx, {
          legacyIngredientId: "clegacy1",
          conceptId: garlic,
          status: "MAPPED",
        })
      );
      const second = await prisma.$transaction((tx) =>
        upsertLegacyMapping(tx, {
          legacyIngredientId: "clegacy1",
          conceptId: garlic,
          status: "MAPPED",
          note: "checked",
        })
      );
      expect(first.migratedAt).not.toBeNull();
      expect(second.migratedAt).toBe(first.migratedAt);
      expect(await getLegacyMapping("clegacy1")).toMatchObject({
        status: "MAPPED",
        note: "checked",
      });
    });
  });
});

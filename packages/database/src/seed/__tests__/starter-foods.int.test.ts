import {
  buildResolverContext,
  processIngredientLine,
  summarizeResolution,
} from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../client.js";
import {
  createNote,
  createUser,
  hasTestDatabase,
  resetDatabase,
} from "../../repository/ontology/__tests__/int-helpers.js";
import { applyDecision } from "../../repository/ontology/apply-decision.js";
import { saveImportedLine } from "../../repository/ontology/backfill.js";
import { OntologyError } from "../../repository/ontology/helpers.js";
import {
  getIngredientCardCounts,
  listIngredientSummaries,
} from "../../repository/ontology/ingredient-card.js";
import {
  previewDecision,
  reinterpretAffected,
} from "../../repository/ontology/preview.js";
import { loadResolverSnapshot } from "../../repository/ontology/resolver-context.js";
import {
  type ModifierSeedEntry,
  seedLexiconModifiers,
} from "../lexicon-modifiers.js";
import { seedOntologyVocabulary } from "../ontology-vocabulary.js";
import { type StarterFoodsSeed, seedStarterFoods } from "../starter-foods.js";

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

const fileSeed = fixture<StarterFoodsSeed>("starter-foods.seed.json");
/** The file proposes every food; most tests need them approved, keeping the two the file marks proposed on their own. */
const seed: StarterFoodsSeed = { ...fileSeed, status: "VERIFIED" };

async function context() {
  return buildResolverContext(await loadResolverSnapshot());
}

async function conceptNamed(canonicalName: string) {
  return prisma.foodConcept.findFirstOrThrow({
    where: { canonicalName },
    select: { id: true, status: true },
  });
}

async function importLines(lines: string[], title = "Stew") {
  const ctx = await context();
  const noteId = await createNote(title);
  for (const [lineIndex, reference] of lines.entries())
    await saveImportedLine(
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
  return noteId;
}

describe.skipIf(!hasTestDatabase)(
  "starter foods and approval (integration)",
  () => {
    beforeEach(async () => {
      await resetDatabase();
      await seedOntologyVocabulary();
      await seedLexiconModifiers(modifiers);
    });

    afterAll(async () => {
      await resetDatabase();
    });

    it("seeds names, hierarchy, and applicability once, so real lines resolve", async () => {
      const first = await seedStarterFoods(seed);
      expect(first).toMatchObject({
        conceptsCreated: seed.concepts.length,
        relationshipsCreated: seed.concepts.reduce(
          (count, food) => count + (food.relationships?.length ?? 0),
          0
        ),
        attributesAdded: 3,
        applicabilityAdded: seed.applicability.length,
        propertiesAdded: seed.concepts.reduce(
          (count, food) => count + (food.properties?.length ?? 0),
          0
        ),
      });
      expect(first.revision).not.toBeNull();
      expect(await seedStarterFoods(seed)).toEqual({
        conceptsCreated: 0,
        entriesCreated: 0,
        relationshipsCreated: 0,
        attributesAdded: 0,
        applicabilityAdded: 0,
        propertiesAdded: 0,
        revision: null,
      });

      expect(await conceptNamed("chicken drumstick")).toMatchObject({
        status: "PROPOSED",
      });
      expect(await conceptNamed("chicken thigh")).toMatchObject({
        status: "VERIFIED",
      });

      const ctx = await context();
      const read = (line: string) => {
        const [mention] = processIngredientLine(line, ctx).mentions;
        return mention ? summarizeResolution(mention, ctx) : null;
      };
      expect(read("1 lb boneless skinless chicken thighs")).toMatchObject({
        status: "AUTO_RESOLVED",
        conceptName: "chicken thigh",
        attributes: ["bone:boneless", "skin:skinless"],
      });
      expect(read("2 tbsp unsalted butter")).toMatchObject({
        conceptName: "butter",
        attributes: ["salt_level:unsalted"],
      });
      expect(read("1 cup confectioners sugar")?.conceptName).toBe(
        "powdered sugar"
      );
      expect(read("6 drumsticks")?.status).toBe("UNRESOLVED");
      expect(read("2 cups flour")?.conceptName).toBe("flour");
      expect(read("1 cup all-purpose flour")?.conceptName).toBe(
        "all-purpose flour"
      );
    });

    it("puts every starter food in the review queue by default, with names imports don't use yet", async () => {
      await seedStarterFoods(fileSeed);
      expect(
        await prisma.foodConcept.count({ where: { status: "VERIFIED" } })
      ).toBe(0);
      expect(
        await prisma.foodConcept.count({ where: { status: "PROPOSED" } })
      ).toBe(fileSeed.concepts.length);
      expect(
        await prisma.lexiconEntry.count({
          where: { role: "FOOD", status: "ACTIVE" },
        })
      ).toBe(0);
      expect(
        (await listIngredientSummaries("unreviewed")).map((item) => item.name)
      ).toContain("chicken thigh");
      const ctx = await context();
      const [mention] = processIngredientLine(
        "1 lb chicken thighs",
        ctx
      ).mentions;
      expect(mention ? summarizeResolution(mention, ctx).status : null).toBe(
        "UNRESOLVED"
      );
    });

    it("lists approved and proposed foods separately on the ingredients page, with usage and base ingredients", async () => {
      await seedStarterFoods(seed);
      await importLines([
        "1 lb chicken thighs",
        "2 chicken thighs, diced",
        "1 cup milk",
      ]);

      const approved = await listIngredientSummaries("all");
      expect(approved).toHaveLength(seed.concepts.length - 2);
      const chicken = approved.find((item) => item.name === "chicken");
      expect(
        approved.find((item) => item.name === "chicken thigh")
      ).toMatchObject({
        plural: "chicken thighs",
        parentIngredientId: chicken?.id,
        referenceCount: 2,
      });
      expect(approved.find((item) => item.name === "milk")).toMatchObject({
        isReviewed: true,
        parentIngredientId: null,
        referenceCount: 1,
      });
      expect(
        (await listIngredientSummaries("unreviewed")).map((item) => item.name)
      ).toEqual(["chicken drumstick", "lemon zest"]);
      expect(await getIngredientCardCounts()).toEqual({
        all: seed.concepts.length - 2,
        unreviewed: 2,
      });
    });

    it("approves a proposed food: preview, names activated, mentions reinterpreted, and revert", async () => {
      await seedStarterFoods(seed);
      await importLines(["6 drumsticks", "4 chicken drumsticks"]);
      const userId = await createUser();
      const drumstick = await conceptNamed("chicken drumstick");
      const payload = {
        type: "APPROVE_CONCEPT" as const,
        conceptId: drumstick.id,
      };

      const preview = await previewDecision(payload);
      expect(preview.counts).toMatchObject({ affected: 2, newlyResolved: 2 });

      const applied = await applyDecision({
        payload,
        userId,
        discoveryId: null,
      });
      expect(await conceptNamed("chicken drumstick")).toMatchObject({
        status: "VERIFIED",
      });
      expect(
        await prisma.lexiconEntry.count({
          where: { conceptId: drumstick.id, status: "PROPOSED" },
        })
      ).toBe(0);
      const reinterpreted = await reinterpretAffected(applied.payload);
      expect(reinterpreted).toMatchObject({
        linesReprocessed: 2,
        needsBackgroundReinterpret: false,
      });
      expect(
        await prisma.ingredientMention.count({
          where: { conceptId: drumstick.id },
        })
      ).toBe(2);
      expect(
        (await listIngredientSummaries("all")).some(
          (item) => item.name === "chicken drumstick"
        )
      ).toBe(true);

      await expect(
        applyDecision({ payload, userId, discoveryId: null })
      ).rejects.toThrow(OntologyError);

      await applyDecision({
        payload: { type: "REVERT", decisionId: applied.decisionId },
        userId,
        discoveryId: null,
      });
      expect(await conceptNamed("chicken drumstick")).toMatchObject({
        status: "PROPOSED",
      });
      expect(
        await prisma.lexiconEntry.count({
          where: { conceptId: drumstick.id, status: "ACTIVE" },
        })
      ).toBe(0);
      expect(
        (await listIngredientSummaries("unreviewed")).map((item) => item.name)
      ).toContain("chicken drumstick");
    });
  }
);

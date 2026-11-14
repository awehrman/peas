import { entryMatchKey } from "@peas/parser/v2";
import type { FoodRelationshipType, LexiconTermKind } from "@prisma/client";

import { prisma } from "../client.js";
import { setClassification } from "../repository/ontology/classifications.js";
import { createConcept } from "../repository/ontology/concepts.js";
import {
  type DbClient,
  OntologyError,
  computeTargetKey,
} from "../repository/ontology/helpers.js";
import {
  INGREDIENT_PROPERTY_CLASSIFICATIONS,
  type IngredientStoredProperty,
} from "../repository/ontology/ingredient-card.js";
import { createLexiconEntries } from "../repository/ontology/lexicon.js";
import { addRelationship } from "../repository/ontology/relationships.js";
import { bumpRevision } from "../repository/ontology/revision.js";

/**
 * One starter food from packages/parser/fixtures/lexicon/starter-foods.seed.json. Relationships point at other concepts by `key`; attributes are `<dimension>:<value>` vocabulary keys; properties are the ingredient card's core types and allergens, set on base foods so variants inherit them.
 *
 * @example
 * { key: "chicken", name: "chicken", properties: ["MEAT"] }
 * { key: "chicken-thigh", name: "chicken thigh", plural: "chicken thighs", relationships: [["PART_OF", "chicken"]] }
 * { key: "chicken-drumstick", name: "chicken drumstick", aliases: ["drumsticks"], status: "PROPOSED" }
 */
export interface StarterFood {
  key: string;
  name: string;
  plural?: string;
  aliases?: string[];
  relationships?: [FoodRelationshipType, string][];
  attributes?: string[];
  properties?: IngredientStoredProperty[];
  /** Overrides the seed's `status`. VERIFIED foods get ACTIVE names; PROPOSED foods keep PROPOSED names until approved. */
  status?: "VERIFIED" | "PROPOSED";
}

export interface StarterFoodsSeed {
  /** Status for foods that don't set their own; VERIFIED when absent. PROPOSED puts every food in the ingredients page's review queue. */
  status?: "VERIFIED" | "PROPOSED";
  concepts: StarterFood[];
  /** `[dimension key, concept key]`: the attribute dimension applies to that concept and its IS_A / PART_OF descendants. */
  applicability: [string, string][];
}

export interface StarterFoodsSummary {
  conceptsCreated: number;
  entriesCreated: number;
  relationshipsCreated: number;
  attributesAdded: number;
  applicabilityAdded: number;
  /** Properties don't change how lines resolve, so they never bump the revision. */
  propertiesAdded: number;
  /** Null when nothing that affects resolution was added. */
  revision: number | null;
}

function validate(seed: StarterFoodsSeed): void {
  const keys = new Set<string>();
  for (const food of seed.concepts) {
    if (keys.has(food.key))
      throw new OntologyError(`Duplicate starter food key "${food.key}"`);
    keys.add(food.key);
  }
  for (const food of seed.concepts)
    for (const [, target] of food.relationships ?? [])
      if (!keys.has(target))
        throw new OntologyError(
          `"${food.key}" relates to unknown starter food "${target}"`
        );
  for (const food of seed.concepts)
    for (const property of food.properties ?? [])
      if (!(property in INGREDIENT_PROPERTY_CLASSIFICATIONS))
        throw new OntologyError(
          `"${food.key}" has unknown property "${property}"`
        );
  for (const [, conceptKey] of seed.applicability)
    if (!keys.has(conceptKey))
      throw new OntologyError(
        `Applicability names unknown starter food "${conceptKey}"`
      );
}

function namesOf(food: StarterFood): { text: string; kind: LexiconTermKind }[] {
  return [
    { text: food.name, kind: "CANONICAL" as const },
    ...(food.plural ? [{ text: food.plural, kind: "PLURAL" as const }] : []),
    ...(food.aliases ?? []).map((text) => ({ text, kind: "ALIAS" as const })),
  ];
}

/**
 * Loads a handful of everyday foods with their names, hierarchy, characterizing attributes, and attribute applicability, so a fresh database resolves real lines ("1 lb boneless chicken thighs") and the ingredients page has something on it. Idempotent: concepts are matched by canonical name (merged ones ignored), and the revision is bumped once ("seed:foods") only when something was added. Requires the vocabulary seed (`db:seed:ontology`).
 *
 * @example
 * await seedStarterFoods(seed) // { conceptsCreated: 33, entriesCreated: 50, relationshipsCreated: 22, ..., propertiesAdded: 13, revision: 3 }
 * await seedStarterFoods(seed) // { conceptsCreated: 0, ..., revision: null }
 */
export async function seedStarterFoods(
  seed: StarterFoodsSeed
): Promise<StarterFoodsSummary> {
  validate(seed);
  return prisma.$transaction((tx) => seedInTransaction(tx, seed), {
    timeout: 60_000,
    maxWait: 10_000,
  });
}

async function seedInTransaction(
  tx: DbClient,
  seed: StarterFoodsSeed
): Promise<StarterFoodsSummary> {
  const summary: StarterFoodsSummary = {
    conceptsCreated: 0,
    entriesCreated: 0,
    relationshipsCreated: 0,
    attributesAdded: 0,
    applicabilityAdded: 0,
    propertiesAdded: 0,
    revision: null,
  };
  const revision = async () =>
    (summary.revision ??= await bumpRevision(tx, "seed:foods"));

  const definitions = await tx.attributeDefinition.findMany({
    include: { values: true },
  });
  const definitionIds = new Map(definitions.map((row) => [row.key, row.id]));
  const attributeIds = new Map<string, string>(
    definitions.flatMap((definition) =>
      definition.values.map((value): [string, string] => [
        `${definition.key}:${value.key}`,
        value.id,
      ])
    )
  );

  const conceptIds = new Map<string, string>();
  for (const food of seed.concepts) {
    const existing = await tx.foodConcept.findFirst({
      where: {
        canonicalName: { equals: food.name, mode: "insensitive" },
        status: { not: "DEPRECATED" },
      },
      select: { id: true },
    });
    if (existing) {
      conceptIds.set(food.key, existing.id);
      continue;
    }
    await revision();
    const created = await createConcept(tx, {
      canonicalName: food.name,
      status: food.status ?? seed.status ?? "VERIFIED",
    });
    conceptIds.set(food.key, created.id);
    summary.conceptsCreated += 1;
  }
  const idOf = (key: string) => conceptIds.get(key) as string;

  for (const food of seed.concepts) {
    const conceptId = idOf(food.key);
    const targetKey = computeTargetKey({ role: "FOOD", conceptId });
    const missing = [];
    for (const name of namesOf(food)) {
      const found = await tx.lexiconEntry.findUnique({
        where: {
          matchKey_targetKey: { matchKey: entryMatchKey(name.text), targetKey },
        },
        select: { id: true },
      });
      if (!found) missing.push(name);
    }
    if (missing.length > 0) {
      const results = await createLexiconEntries(
        tx,
        missing.map((name) => ({
          text: name.text,
          kind: name.kind,
          role: "FOOD" as const,
          conceptId,
          status:
            (food.status ?? seed.status) === "PROPOSED" ? "PROPOSED" : "ACTIVE",
        })),
        await revision()
      );
      summary.entriesCreated += results.filter((row) => row.created).length;
    }

    for (const [type, targetKey] of food.relationships ?? []) {
      const targetId = idOf(targetKey);
      const found = await tx.foodRelationship.findFirst({
        where: {
          sourceId: conceptId,
          targetId,
          type,
          status: { not: "DEPRECATED" },
        },
        select: { id: true },
      });
      if (found) continue;
      await revision();
      await addRelationship(tx, {
        sourceId: conceptId,
        targetId,
        type,
        status: "ACTIVE",
      });
      summary.relationshipsCreated += 1;
    }

    for (const attribute of food.attributes ?? []) {
      const attributeValueId = attributeIds.get(attribute);
      if (!attributeValueId)
        throw new OntologyError(
          `Unknown attribute "${attribute}" for "${food.name}"; run db:seed:ontology first`
        );
      const found = await tx.conceptAttribute.findUnique({
        where: { conceptId_attributeValueId: { conceptId, attributeValueId } },
        select: { conceptId: true },
      });
      if (found) continue;
      await revision();
      await tx.conceptAttribute.create({
        data: { conceptId, attributeValueId, source: "MANUAL" },
      });
      summary.attributesAdded += 1;
    }

    for (const property of food.properties ?? []) {
      const { kind, key } = INGREDIENT_PROPERTY_CLASSIFICATIONS[property];
      const found = await tx.foodClassification.findUnique({
        where: { conceptId_key: { conceptId, key } },
        select: { id: true },
      });
      if (found) continue;
      await setClassification(tx, { conceptId, kind, key, value: "TRUE" });
      summary.propertiesAdded += 1;
    }
  }

  for (const [dimension, conceptKey] of seed.applicability) {
    const definitionId = definitionIds.get(dimension);
    if (!definitionId)
      throw new OntologyError(
        `Unknown attribute dimension "${dimension}"; run db:seed:ontology first`
      );
    const conceptId = idOf(conceptKey);
    const found = await tx.attributeApplicability.findUnique({
      where: { definitionId_conceptId: { definitionId, conceptId } },
      select: { conceptId: true },
    });
    if (found) continue;
    await revision();
    await tx.attributeApplicability.create({
      data: { definitionId, conceptId },
    });
    summary.applicabilityAdded += 1;
  }

  return summary;
}

import {
  buildResolverContext,
  entryTokenKeys,
  processIngredientLine,
} from "@peas/parser/v2";
import type { ClassificationKind, LegacyMappingStatus } from "@prisma/client";

import { prisma } from "../client.js";
import { createConcept } from "../repository/ontology/concepts.js";
import { upsertDiscoveries } from "../repository/ontology/discoveries.js";
import type { DbClient } from "../repository/ontology/helpers.js";
import { upsertLegacyMapping } from "../repository/ontology/legacy-mapping.js";
import {
  type LexiconEntryCreateInput,
  createLexiconEntries,
} from "../repository/ontology/lexicon.js";
import { loadResolverSnapshot } from "../repository/ontology/resolver-context.js";
import { bumpRevision } from "../repository/ontology/revision.js";

/** Legacy `PropertyType` -> classification (Phase 3f fixed table). */
export const LEGACY_PROPERTY_CLASSIFICATIONS: Readonly<
  Record<string, { kind: ClassificationKind; key: string }>
> = {
  VEGAN: { kind: "DIETARY", key: "VEGAN" },
  VEGETARIAN: { kind: "DIETARY", key: "VEGETARIAN" },
  GLUTEN_FREE: { kind: "DIETARY", key: "GLUTEN_FREE" },
  ALCOHOL: { kind: "DIETARY", key: "CONTAINS_ALCOHOL" },
  MEAT: { kind: "FOOD_GROUP", key: "MEAT" },
  FISH: { kind: "FOOD_GROUP", key: "FISH" },
  DAIRY: { kind: "FOOD_GROUP", key: "DAIRY" },
  EGG: { kind: "FOOD_GROUP", key: "EGG" },
  GRAIN: { kind: "FOOD_GROUP", key: "GRAIN" },
  LEGUME: { kind: "FOOD_GROUP", key: "LEGUME" },
  FRUIT: { kind: "FOOD_GROUP", key: "FRUIT" },
  VEGETABLE: { kind: "FOOD_GROUP", key: "VEGETABLE" },
  HERB: { kind: "FOOD_GROUP", key: "HERB" },
  SPICE: { kind: "FOOD_GROUP", key: "SPICE" },
  NUTS: { kind: "ALLERGEN", key: "ALLERGEN_TREE_NUTS" },
  SHELLFISH: { kind: "ALLERGEN", key: "ALLERGEN_SHELLFISH" },
  SOY: { kind: "ALLERGEN", key: "ALLERGEN_SOY" },
  SESAME: { kind: "ALLERGEN", key: "ALLERGEN_SESAME" },
  CORN: { kind: "ALLERGEN", key: "ALLERGEN_CORN" },
};

/** Words in a child's name that suggest PART_OF rather than IS_A ("chicken thigh" PART_OF "chicken"). */
const PART_WORDS = new Set([
  "thigh",
  "thighs",
  "breast",
  "breasts",
  "leg",
  "legs",
  "wing",
  "wings",
  "drumstick",
  "drumsticks",
  "loin",
  "shoulder",
  "rib",
  "ribs",
  "fillet",
  "fillets",
  "zest",
  "juice",
  "yolk",
  "yolks",
  "white",
  "whites",
  "leaf",
  "leaves",
  "stem",
  "stems",
  "peel",
  "rind",
  "seed",
  "seeds",
]);

/** Mapping notes; pass 3 copies legacy data only onto concepts created from that ingredient. */
const NOTE_CREATED = "created";
const NOTE_ATTRIBUTE_COMPOSED = "attribute-composed";
const NOTE_MODIFIER_COMPOSED = "modifier-composed";
const NOTE_DUPLICATE = "duplicate-of-existing";

export interface LegacySeedOptions {
  /** Ingredients per transaction (default 200). */
  batchSize?: number;
  /** Runs everything in one transaction and rolls it back, reporting what would change. */
  dryRun?: boolean;
  log?: (message: string) => void;
}

export interface LegacySeedSummary {
  dryRun: boolean;
  legacyIngredients: number;
  conceptsCreated: number;
  mappings: Record<LegacyMappingStatus, number>;
  discoveriesCreated: number;
  classificationsCreated: number;
  substitutionsCreated: number;
  productsCreated: number;
  revisions: number[];
}

interface LegacyIngredient {
  id: string;
  name: string;
  plural: string | null;
  isReviewed: boolean;
  isComposedIngredient: boolean;
  parentIngredientId: string | null;
  aliases: { name: string; plural: string | null }[];
  properties: { propertyType: string }[];
  category: { name: string } | null;
  tags: { id: string }[];
  substitutions: { id: string }[];
  brands: { id: string; name: string }[];
}

class DryRunRollback extends Error {}

function wordCount(name: string): number {
  return entryTokenKeys(name).filter((token) => /[\p{L}\p{N}]/u.test(token))
    .length;
}

function isSimple(ingredient: LegacyIngredient): boolean {
  return ingredient.isReviewed || wordCount(ingredient.name) <= 2;
}

function guessRelationship(child: string, parent: string): "IS_A" | "PART_OF" {
  const childWords = child.toLowerCase().split(/\s+/);
  const parentWords = parent.toLowerCase().split(/\s+/);
  if (
    childWords.some(
      (word) => PART_WORDS.has(word) && !parentWords.includes(word)
    )
  )
    return "PART_OF";
  return "IS_A";
}

/**
 * Seeds the ontology from legacy `Ingredient` rows (Phase 3f) in three passes. Resumable and idempotent: ingredients that already have a `LegacyIngredientMapping` are skipped in passes 1 and 2, and pass 3 only creates rows that are missing. Never inserts IS_A edges; legacy parents become RELATIONSHIP_SUGGESTION discoveries.
 *
 * @example
 * await seedOntologyFromLegacy({ dryRun: true }) // what would change, with nothing written
 * await seedOntologyFromLegacy({ batchSize: 200 })
 */
export async function seedOntologyFromLegacy(
  options: LegacySeedOptions = {}
): Promise<LegacySeedSummary> {
  const { batchSize = 200, dryRun = false, log = () => undefined } = options;
  if (!dryRun) return runPasses(null, batchSize, log, false);

  let summary: LegacySeedSummary | undefined;
  try {
    await prisma.$transaction(
      async (tx) => {
        summary = await runPasses(tx, batchSize, log, true);
        throw new DryRunRollback("dry run");
      },
      { timeout: 600_000, maxWait: 10_000 }
    );
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }
  if (!summary) throw new Error("Dry run produced no summary");
  return summary;
}

async function runPasses(
  dryRunTx: DbClient | null,
  batchSize: number,
  log: (message: string) => void,
  dryRun: boolean
): Promise<LegacySeedSummary> {
  const db: DbClient = dryRunTx ?? prisma;
  const inBatch = <T>(work: (tx: DbClient) => Promise<T>): Promise<T> =>
    dryRunTx
      ? work(dryRunTx)
      : prisma.$transaction((tx) => work(tx), {
          timeout: 120_000,
          maxWait: 10_000,
        });

  const summary: LegacySeedSummary = {
    dryRun,
    legacyIngredients: 0,
    conceptsCreated: 0,
    mappings: { PENDING: 0, MAPPED: 0, NEEDS_REVIEW: 0, SKIPPED: 0 },
    discoveriesCreated: 0,
    classificationsCreated: 0,
    substitutionsCreated: 0,
    productsCreated: 0,
    revisions: [],
  };

  const ingredients: LegacyIngredient[] = await db.ingredient.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      plural: true,
      isReviewed: true,
      isComposedIngredient: true,
      parentIngredientId: true,
      aliases: { select: { name: true, plural: true } },
      properties: { select: { propertyType: true } },
      category: { select: { name: true } },
      tags: { select: { id: true } },
      substitutions: { select: { id: true } },
      brands: { select: { id: true, name: true } },
    },
  });
  summary.legacyIngredients = ingredients.length;

  const mapped = async () =>
    new Set(
      (
        await db.legacyIngredientMapping.findMany({
          select: { legacyIngredientId: true },
        })
      ).map((row) => row.legacyIngredientId)
    );

  /** Bumps the pass revision on first write, so passes with nothing to do leave the revision alone. */
  const passRevision = (reason: string) => {
    let revision: number | null = null;
    return async (tx: DbClient) => {
      if (revision === null) {
        revision = await bumpRevision(tx, reason);
        summary.revisions.push(revision);
      }
      return revision;
    };
  };

  const createConceptWithEntries = async (
    tx: DbClient,
    ingredient: LegacyIngredient,
    revision: number
  ): Promise<string> => {
    const status = ingredient.isReviewed ? "ACTIVE" : "PROPOSED";
    const { id } = await createConcept(tx, {
      canonicalName: ingredient.name,
      status: ingredient.isReviewed ? "VERIFIED" : "PROPOSED",
    });
    summary.conceptsCreated += 1;
    const entries: LexiconEntryCreateInput[] = [
      {
        text: ingredient.name,
        role: "FOOD",
        kind: "CANONICAL",
        conceptId: id,
        status,
      },
    ];
    if (ingredient.plural)
      entries.push({
        text: ingredient.plural,
        role: "FOOD",
        kind: "PLURAL",
        conceptId: id,
        status,
      });
    for (const alias of ingredient.aliases) {
      entries.push({
        text: alias.name,
        role: "FOOD",
        kind: "ALIAS",
        conceptId: id,
        status,
      });
      if (alias.plural)
        entries.push({
          text: alias.plural,
          role: "FOOD",
          kind: "PLURAL",
          conceptId: id,
          status,
        });
    }
    await createLexiconEntries(tx, entries, revision);
    return id;
  };

  const recordMapping = async (
    tx: DbClient,
    legacyIngredientId: string,
    conceptId: string | null,
    status: LegacyMappingStatus,
    note: string
  ) => {
    await upsertLegacyMapping(tx, {
      legacyIngredientId,
      conceptId,
      status,
      note,
    });
    summary.mappings[status] += 1;
  };

  const batches = <T>(items: T[]): T[][] => {
    const result: T[][] = [];
    for (let start = 0; start < items.length; start += batchSize)
      result.push(items.slice(start, start + batchSize));
    return result;
  };

  // Pass 1: simple names
  const pass1Revision = passRevision("legacy-import:pass-1");
  const alreadyMapped = await mapped();
  const simple = ingredients.filter(
    (ingredient) => !alreadyMapped.has(ingredient.id) && isSimple(ingredient)
  );
  for (const batch of batches(simple)) {
    await inBatch(async (tx) => {
      const revision = await pass1Revision(tx);
      for (const ingredient of batch) {
        const conceptId = await createConceptWithEntries(
          tx,
          ingredient,
          revision
        );
        await recordMapping(
          tx,
          ingredient.id,
          conceptId,
          "MAPPED",
          NOTE_CREATED
        );
      }
    });
  }
  log(`pass 1: ${simple.length} simple names`);

  // Pass 2: longer names, read through the resolver
  const pass2Revision = passRevision("legacy-import:pass-2");
  const afterPass1 = await mapped();
  const longer = ingredients.filter(
    (ingredient) => !afterPass1.has(ingredient.id)
  );
  if (longer.length > 0) {
    const context = buildResolverContext(await loadResolverSnapshot(db));
    for (const batch of batches(longer)) {
      await inBatch(async (tx) => {
        const revision = await pass2Revision(tx);
        for (const ingredient of batch) {
          const [mention] = processIngredientLine(ingredient.name, context, {
            mode: "EXPLORATORY",
          }).mentions;
          const best = mention?.resolution.candidates[0];
          const fullyExplained =
            best !== undefined && best.unresolved.length === 0;

          if (best && fullyExplained && best.attributes.length > 0) {
            const conceptId = await createConceptWithEntries(
              tx,
              ingredient,
              revision
            );
            const modifierEntryIds = best.attributes.flatMap((attribute) =>
              attribute.lexiconEntryId ? [attribute.lexiconEntryId] : []
            );
            if (modifierEntryIds.length > 0) {
              await upsertDiscoveries(
                tx,
                [
                  {
                    key: ingredient.name.toLowerCase(),
                    payload: {
                      type: "IDENTITY_DECISION",
                      phrase: ingredient.name,
                      modifierEntryIds,
                      headConceptId: best.conceptId,
                      cooccurrence: 0,
                    },
                    evidence: [],
                  },
                ],
                revision
              );
              summary.discoveriesCreated += 1;
            }
            await recordMapping(
              tx,
              ingredient.id,
              conceptId,
              "NEEDS_REVIEW",
              NOTE_ATTRIBUTE_COMPOSED
            );
          } else if (
            best &&
            fullyExplained &&
            (best.preparations.length > 0 || best.modifiers.length > 0)
          ) {
            await recordMapping(
              tx,
              ingredient.id,
              best.conceptId,
              "NEEDS_REVIEW",
              NOTE_MODIFIER_COMPOSED
            );
          } else if (best && fullyExplained) {
            await recordMapping(
              tx,
              ingredient.id,
              best.conceptId,
              "NEEDS_REVIEW",
              NOTE_DUPLICATE
            );
          } else {
            const conceptId = await createConceptWithEntries(
              tx,
              ingredient,
              revision
            );
            await recordMapping(
              tx,
              ingredient.id,
              conceptId,
              "MAPPED",
              NOTE_CREATED
            );
          }
        }
      });
    }
  }
  log(`pass 2: ${longer.length} longer names`);

  // Pass 3: relationships and attached data, onto concepts created from each ingredient
  const pass3Revision = passRevision("legacy-import:pass-3");
  const mappings = await db.legacyIngredientMapping.findMany({
    select: { legacyIngredientId: true, conceptId: true, note: true },
  });
  const conceptByLegacy = new Map(
    mappings.flatMap((mapping) =>
      mapping.conceptId
        ? [[mapping.legacyIngredientId, mapping.conceptId] as const]
        : []
    )
  );
  const ownsConcept = new Set(
    mappings
      .filter(
        (mapping) =>
          mapping.note === NOTE_CREATED ||
          mapping.note === NOTE_ATTRIBUTE_COMPOSED
      )
      .map((mapping) => mapping.legacyIngredientId)
  );
  const names = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient.name])
  );

  for (const batch of batches(
    ingredients.filter((ingredient) => ownsConcept.has(ingredient.id))
  )) {
    await inBatch(async (tx) => {
      for (const ingredient of batch) {
        const conceptId = conceptByLegacy.get(ingredient.id);
        if (!conceptId) continue;

        const parentConceptId = ingredient.parentIngredientId
          ? conceptByLegacy.get(ingredient.parentIngredientId)
          : undefined;
        if (parentConceptId && parentConceptId !== conceptId) {
          const key = `legacy-parent:${conceptId}->${parentConceptId}`;
          const existing = await tx.discovery.findUnique({
            where: { type_key: { type: "RELATIONSHIP_SUGGESTION", key } },
            select: { id: true },
          });
          if (!existing) {
            const parentName =
              names.get(ingredient.parentIngredientId ?? "") ?? "";
            await upsertDiscoveries(
              tx,
              [
                {
                  key,
                  payload: {
                    type: "RELATIONSHIP_SUGGESTION",
                    sourceConceptId: conceptId,
                    targetConceptId: parentConceptId,
                    relationshipType: guessRelationship(
                      ingredient.name,
                      parentName
                    ),
                    evidence: `legacy variant of "${parentName}"`,
                  },
                  evidence: [],
                },
              ],
              await pass3Revision(tx)
            );
            summary.discoveriesCreated += 1;
          }
        }

        const classifications = [
          ...ingredient.properties.flatMap((property) => {
            const mapping =
              LEGACY_PROPERTY_CLASSIFICATIONS[property.propertyType];
            return mapping ? [mapping] : [];
          }),
          ...(ingredient.category
            ? [
                {
                  kind: "CATEGORY" as const,
                  key: `CATEGORY:${ingredient.category.name}`,
                },
              ]
            : []),
        ];
        for (const classification of classifications) {
          const exists = await tx.foodClassification.findUnique({
            where: { conceptId_key: { conceptId, key: classification.key } },
            select: { id: true },
          });
          if (exists) continue;
          await pass3Revision(tx);
          await tx.foodClassification.create({
            data: {
              conceptId,
              ...classification,
              value: "TRUE",
              source: "LEGACY",
            },
          });
          summary.classificationsCreated += 1;
        }

        if (ingredient.tags.length > 0) {
          await tx.foodConcept.update({
            where: { id: conceptId },
            data: {
              tags: { connect: ingredient.tags.map((tag) => ({ id: tag.id })) },
            },
          });
        }
        if (ingredient.isComposedIngredient) {
          await tx.foodConcept.update({
            where: { id: conceptId },
            data: { isComposed: true },
          });
        }

        for (const substitution of ingredient.substitutions) {
          const toConceptId = conceptByLegacy.get(substitution.id);
          if (!toConceptId || toConceptId === conceptId) continue;
          const exists = await tx.foodSubstitution.findUnique({
            where: {
              fromConceptId_toConceptId: {
                fromConceptId: conceptId,
                toConceptId,
              },
            },
            select: { id: true },
          });
          if (exists) continue;
          await pass3Revision(tx);
          await tx.foodSubstitution.create({
            data: {
              fromConceptId: conceptId,
              toConceptId,
              note: "legacy substitution",
            },
          });
          summary.substitutionsCreated += 1;
        }

        for (const brand of ingredient.brands) {
          const exists = await tx.foodProduct.findUnique({
            where: {
              brandId_name: { brandId: brand.id, name: ingredient.name },
            },
            select: { id: true },
          });
          if (exists) continue;
          await pass3Revision(tx);
          await tx.foodProduct.create({
            data: { brandId: brand.id, name: ingredient.name, conceptId },
          });
          summary.productsCreated += 1;
        }
      }
    });
  }
  log("pass 3: relationships and attached data");

  return summary;
}

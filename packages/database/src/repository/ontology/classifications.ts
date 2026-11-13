import type { DbClient } from "./helpers.js";
import { getAncestors } from "./relationships.js";

import {
  type AncestorClassifications,
  type EffectiveClassification,
  FOOD_RELATIONSHIP_TYPES,
  effectiveClassifications,
} from "@peas/parser/v2";
import type { ClassificationKind, TriState, ValueSource } from "@prisma/client";

import { prisma } from "../../client.js";

/**
 * @example
 * { conceptId: "<milk>", kind: "FOOD_GROUP", key: "DAIRY", value: "TRUE" }
 * { conceptId: "<milk>", kind: "ALLERGEN", key: "ALLERGEN_MILK", value: "TRUE", source: "LEGACY" }
 */
export interface ClassificationSetInput {
  conceptId: string;
  kind: ClassificationKind;
  key: string;
  value: TriState;
  source?: ValueSource;
  note?: string | null;
}

/**
 * Sets an explicit classification, replacing any earlier value for the same key.
 *
 * @example
 * await setClassification(tx, { conceptId: milk, kind: "ALLERGEN", key: "ALLERGEN_MILK", value: "TRUE" })
 */
export async function setClassification(
  tx: DbClient,
  input: ClassificationSetInput
): Promise<{ id: string }> {
  const data = {
    kind: input.kind,
    value: input.value,
    source: input.source ?? "MANUAL",
    note: input.note ?? null,
  };
  return tx.foodClassification.upsert({
    where: { conceptId_key: { conceptId: input.conceptId, key: input.key } },
    create: { conceptId: input.conceptId, key: input.key, ...data },
    update: data,
    select: { id: true },
  });
}

/**
 * Explicit classifications plus those inherited through every relationship type, using the D15 rules from @peas/parser/v2.
 *
 * @example
 * // "buttermilk" DERIVED_FROM "milk" (DAIRY TRUE, ALLERGEN_MILK TRUE)
 * await getEffectiveClassifications(buttermilkId)
 * // [{ key: "ALLERGEN_MILK", value: "TRUE", source: "INHERITED", inheritedFromConceptId: milk, path: ["DERIVED_FROM"] }]
 */
export async function getEffectiveClassifications(
  conceptId: string,
  db: DbClient = prisma
): Promise<EffectiveClassification[]> {
  const ancestors = await getAncestors(conceptId, FOOD_RELATIONSHIP_TYPES, db);
  const rows = await db.foodClassification.findMany({
    where: {
      conceptId: {
        in: [conceptId, ...ancestors.map((ancestor) => ancestor.conceptId)],
      },
    },
    select: { conceptId: true, kind: true, key: true, value: true },
  });

  const byConcept = new Map<
    string,
    { kind: ClassificationKind; key: string; value: TriState }[]
  >();
  for (const row of rows) {
    const list = byConcept.get(row.conceptId) ?? [];
    list.push({ kind: row.kind, key: row.key, value: row.value });
    byConcept.set(row.conceptId, list);
  }

  const inherited: AncestorClassifications[] = ancestors.map((ancestor) => ({
    conceptId: ancestor.conceptId,
    path: ancestor.path,
    classifications: byConcept.get(ancestor.conceptId) ?? [],
  }));

  return effectiveClassifications(byConcept.get(conceptId) ?? [], inherited);
}

/** How far up the hierarchy `getEffectiveClassificationsForMany` looks, as `getAncestors` does. */
const MAX_INHERITANCE_DEPTH = 10;

export interface ConceptClassifications {
  /** Explicit values plus inherited ones (explicit wins). */
  effective: EffectiveClassification[];
  /** What the concept would inherit if it had no explicit values. */
  inherited: EffectiveClassification[];
}

/**
 * Effective and inherit-only classifications for many concepts at once: relationships and classifications are read in two queries and the ancestors are walked in memory (nearest path per ancestor), so list pages don't run one recursive query per row.
 *
 * @example
 * const byConcept = await getEffectiveClassificationsForMany([flourId, wheatId]);
 * byConcept.get(flourId)?.inherited // [{ key: "ALLERGEN_GLUTEN", value: "TRUE", source: "INHERITED", inheritedFromConceptId: wheatId, path: ["DERIVED_FROM"] }]
 */
export async function getEffectiveClassificationsForMany(
  conceptIds: readonly string[],
  db: DbClient = prisma
): Promise<Map<string, ConceptClassifications>> {
  const result = new Map<string, ConceptClassifications>();
  if (conceptIds.length === 0) return result;
  const [relationships, rows] = await Promise.all([
    db.foodRelationship.findMany({
      where: { status: { not: "DEPRECATED" } },
      select: { sourceId: true, targetId: true, type: true },
    }),
    db.foodClassification.findMany({
      select: { conceptId: true, kind: true, key: true, value: true },
    }),
  ]);

  const parents = new Map<
    string,
    { targetId: string; type: (typeof relationships)[number]["type"] }[]
  >();
  for (const relationship of relationships) {
    const list = parents.get(relationship.sourceId) ?? [];
    list.push({ targetId: relationship.targetId, type: relationship.type });
    parents.set(relationship.sourceId, list);
  }
  const byConcept = new Map<
    string,
    { kind: ClassificationKind; key: string; value: TriState }[]
  >();
  for (const row of rows) {
    const list = byConcept.get(row.conceptId) ?? [];
    list.push({ kind: row.kind, key: row.key, value: row.value });
    byConcept.set(row.conceptId, list);
  }

  for (const conceptId of conceptIds) {
    const ancestors: AncestorClassifications[] = [];
    const seen = new Set([conceptId]);
    let frontier: {
      conceptId: string;
      path: AncestorClassifications["path"];
    }[] = [{ conceptId, path: [] }];
    for (
      let depth = 0;
      depth < MAX_INHERITANCE_DEPTH && frontier.length > 0;
      depth += 1
    ) {
      const next: typeof frontier = [];
      for (const node of frontier)
        for (const parent of parents.get(node.conceptId) ?? []) {
          if (seen.has(parent.targetId)) continue;
          seen.add(parent.targetId);
          const path = [...node.path, parent.type];
          ancestors.push({
            conceptId: parent.targetId,
            path,
            classifications: byConcept.get(parent.targetId) ?? [],
          });
          next.push({ conceptId: parent.targetId, path });
        }
      frontier = next;
    }
    result.set(conceptId, {
      effective: effectiveClassifications(
        byConcept.get(conceptId) ?? [],
        ancestors
      ),
      inherited: effectiveClassifications([], ancestors),
    });
  }
  return result;
}

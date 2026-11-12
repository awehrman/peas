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

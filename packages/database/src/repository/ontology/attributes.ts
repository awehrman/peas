import { type DbClient, OntologyError, isUniqueViolation } from "./helpers.js";

import type { AttributeValueType } from "@prisma/client";

import { prisma } from "../../client.js";

export interface AttributeVocabularyRecord {
  definitions: {
    id: string;
    key: string;
    name: string;
    valueType: AttributeValueType;
    values: { id: string; key: string; label: string }[];
  }[];
  preparations: { id: string; key: string; label: string }[];
}

/**
 * Every attribute dimension with its values, plus every preparation operation. Small enough to load whole (decision D20).
 *
 * @example
 * const { definitions, preparations } = await getAttributeVocabulary();
 * // definitions -> [{ key: "bone", values: [{ key: "bone_in" }, { key: "boneless" }] }, ...]
 * // preparations -> [{ key: "chop", label: "Chop" }, ...]
 */
export async function getAttributeVocabulary(
  db: DbClient = prisma
): Promise<AttributeVocabularyRecord> {
  const [definitions, preparations] = await Promise.all([
    db.attributeDefinition.findMany({
      orderBy: { key: "asc" },
      select: {
        id: true,
        key: true,
        name: true,
        valueType: true,
        values: {
          orderBy: { key: "asc" },
          select: { id: true, key: true, label: true },
        },
      },
    }),
    db.preparationOperation.findMany({
      orderBy: { key: "asc" },
      select: { id: true, key: true, label: true },
    }),
  ]);
  return { definitions, preparations };
}

/**
 * Adds a value to a dimension.
 *
 * @example
 * await addAttributeValue(tx, { definitionId: color, key: "purple", label: "Purple" }) // { id: "0193..." }
 */
export async function addAttributeValue(
  tx: DbClient,
  input: { definitionId: string; key: string; label: string }
): Promise<{ id: string }> {
  try {
    return await tx.attributeValue.create({
      data: input,
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new OntologyError(
        `The attribute value "${input.key}" already exists`
      );
    throw error;
  }
}

/**
 * Declares (or withdraws) that a dimension applies to concepts and their IS_A / PART_OF descendants, e.g. bone applies to "poultry".
 *
 * @example
 * await setApplicability(tx, boneDefinitionId, [poultryId, porkId])
 * await setApplicability(tx, boneDefinitionId, [porkId], false)
 */
export async function setApplicability(
  tx: DbClient,
  definitionId: string,
  conceptIds: readonly string[],
  applies = true
): Promise<number> {
  if (conceptIds.length === 0) return 0;
  if (!applies) {
    const removed = await tx.attributeApplicability.deleteMany({
      where: { definitionId, conceptId: { in: [...conceptIds] } },
    });
    return removed.count;
  }
  const added = await tx.attributeApplicability.createMany({
    data: conceptIds.map((conceptId) => ({ definitionId, conceptId })),
    skipDuplicates: true,
  });
  return added.count;
}

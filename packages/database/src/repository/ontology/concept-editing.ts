import { type DbClient, OntologyError } from "./helpers.js";

import { prisma } from "../../client.js";

/**
 * Removes an explicit classification. Inherited values from parents still apply.
 *
 * @example
 * await removeClassification(conceptId, "CATEGORY:Spices") // true when a row was deleted
 */
export async function removeClassification(
  conceptId: string,
  key: string,
  db: DbClient = prisma
): Promise<boolean> {
  const { count } = await db.foodClassification.deleteMany({
    where: { conceptId, key },
  });
  return count > 0;
}

function uniqueTagNames(names: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (trimmed && !seen.has(trimmed.toLowerCase()))
      seen.set(trimmed.toLowerCase(), trimmed);
  }
  return [...seen.values()];
}

/**
 * Replaces a concept's tags, creating tags that don't exist yet. Names are trimmed and de-duplicated case-insensitively; the first spelling wins.
 *
 * @example
 * await setConceptTags(conceptId, ["pantry", " Baking ", "pantry"]) // ["Baking", "pantry"]
 */
export async function setConceptTags(
  conceptId: string,
  names: readonly string[],
  db: DbClient = prisma
): Promise<string[]> {
  const unique = uniqueTagNames(names);
  const updated = await db.foodConcept.update({
    where: { id: conceptId },
    data: {
      tags: {
        set: [],
        connectOrCreate: unique.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
    },
    select: { tags: { select: { name: true }, orderBy: { name: "asc" } } },
  });
  return updated.tags.map((tag) => tag.name);
}

/**
 * @example
 * { fromConceptId: "<buttermilk>", toConceptId: "<milk + lemon juice>", ratio: "1:1", note: "for baking" }
 */
export interface SubstitutionInput {
  fromConceptId: string;
  toConceptId: string;
  ratio?: string | null;
  note?: string | null;
}

/**
 * Records that `toConceptId` can stand in for `fromConceptId`, replacing any earlier ratio and note for the pair.
 *
 * @example
 * await setSubstitution({ fromConceptId: buttermilk, toConceptId: yogurt, ratio: "3/4 cup per cup" }) // { id: "0193..." }
 */
export async function setSubstitution(
  input: SubstitutionInput,
  db: DbClient = prisma
): Promise<{ id: string }> {
  if (input.fromConceptId === input.toConceptId)
    throw new OntologyError("A concept can't substitute for itself");
  const data = {
    ratio: input.ratio?.trim() || null,
    note: input.note?.trim() || null,
  };
  return db.foodSubstitution.upsert({
    where: {
      fromConceptId_toConceptId: {
        fromConceptId: input.fromConceptId,
        toConceptId: input.toConceptId,
      },
    },
    create: {
      fromConceptId: input.fromConceptId,
      toConceptId: input.toConceptId,
      ...data,
    },
    update: data,
    select: { id: true },
  });
}

/**
 * @example
 * await removeSubstitution(buttermilk, yogurt) // true when a row was deleted
 */
export async function removeSubstitution(
  fromConceptId: string,
  toConceptId: string,
  db: DbClient = prisma
): Promise<boolean> {
  const { count } = await db.foodSubstitution.deleteMany({
    where: { fromConceptId, toConceptId },
  });
  return count > 0;
}

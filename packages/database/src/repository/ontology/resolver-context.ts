import { getAttributeVocabulary } from "./attributes.js";
import type { DbClient } from "./helpers.js";
import { getCurrentRevision } from "./revision.js";

import { ResolutionSchema, type ResolverSnapshot } from "@peas/parser/v2";

import { prisma } from "../../client.js";

/**
 * Everything the resolver needs, read in one go and safe to cache by revision (the queue keeps it in Redis). Deprecated entries, concepts, and relationships are left out; PROPOSED entries are included so EXPLORATORY parsing can use them.
 *
 * `priorVerifiedShare` comes from verified mentions: for each head phrase (the normalized text of the entry a verified mention matched), the share of verified mentions that chose each concept.
 *
 * @example
 * const context = buildResolverContext(await loadResolverSnapshot());
 * processIngredientLine("1 lb boneless chicken thighs", context);
 */
export async function loadResolverSnapshot(
  db: DbClient = prisma
): Promise<ResolverSnapshot> {
  const [
    revision,
    entries,
    vocabulary,
    concepts,
    relationships,
    applicability,
    conceptAttributes,
    verified,
  ] = await Promise.all([
    getCurrentRevision(db),
    db.lexiconEntry.findMany({
      where: { status: { in: ["ACTIVE", "PROPOSED"] } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        text: true,
        normalized: true,
        role: true,
        status: true,
        kind: true,
        conceptId: true,
        attributeValueId: true,
        preparationId: true,
        valueKey: true,
      },
    }),
    getAttributeVocabulary(db),
    db.foodConcept.findMany({
      where: { status: { not: "DEPRECATED" } },
      select: { id: true, canonicalName: true, status: true },
    }),
    db.foodRelationship.findMany({
      where: { status: { not: "DEPRECATED" } },
      select: { sourceId: true, targetId: true, type: true },
    }),
    db.attributeApplicability.findMany({
      select: { definitionId: true, conceptId: true },
    }),
    db.conceptAttribute.findMany({
      select: { conceptId: true, attributeValueId: true },
    }),
    db.ingredientMention.findMany({
      where: { verifiedAt: { not: null }, conceptId: { not: null } },
      select: { conceptId: true, resolution: true },
    }),
  ]);

  const phraseByEntry = new Map(
    entries.map((entry) => [entry.id, entry.normalized.toLowerCase()])
  );
  const counts = new Map<string, Map<string, number>>();
  for (const mention of verified) {
    const parsed = ResolutionSchema.safeParse(mention.resolution);
    const entryId = parsed.success ? parsed.data.candidates[0]?.entryId : null;
    const phrase = entryId ? phraseByEntry.get(entryId) : undefined;
    if (!phrase || !mention.conceptId) continue;
    const byConcept = counts.get(phrase) ?? new Map<string, number>();
    byConcept.set(
      mention.conceptId,
      (byConcept.get(mention.conceptId) ?? 0) + 1
    );
    counts.set(phrase, byConcept);
  }
  const priorVerifiedShare: Record<string, Record<string, number>> = {};
  for (const [phrase, byConcept] of counts) {
    const total = [...byConcept.values()].reduce(
      (sum, count) => sum + count,
      0
    );
    priorVerifiedShare[phrase] = Object.fromEntries(
      [...byConcept].map(([conceptId, count]) => [conceptId, count / total])
    );
  }

  return {
    revision,
    entries: entries.map((entry) => ({
      id: entry.id,
      text: entry.text,
      role: entry.role,
      status: entry.status === "PROPOSED" ? "PROPOSED" : "ACTIVE",
      kind: entry.kind,
      conceptId: entry.conceptId,
      attributeValueId: entry.attributeValueId,
      preparationId: entry.preparationId,
      valueKey: entry.valueKey,
    })),
    vocabulary,
    concepts,
    relationships,
    applicability,
    conceptAttributes,
    priorVerifiedShare,
  };
}

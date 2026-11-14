import {
  type DbClient,
  OntologyError,
  parseOrThrow,
  toJson,
} from "./helpers.js";

import { HIERARCHICAL_RELATIONSHIP_TYPES } from "@peas/parser/v2";
import type {
  ConceptStatus,
  EntryStatus,
  FoodRelationshipType,
  Prisma,
  TriState,
  ValueSource,
} from "@prisma/client";
import { z } from "zod";

/** A classification both concepts define with contradicting values; the merge aborts until a person resolves it. */
export interface MergeConflict {
  key: string;
  survivorValue: TriState;
  mergedValue: TriState;
}

export class MergeConflictError extends OntologyError {
  constructor(readonly conflicts: MergeConflict[]) {
    super(
      `Resolve conflicting classifications before merging: ${conflicts.map((conflict) => `${conflict.key} (${conflict.survivorValue} vs ${conflict.mergedValue})`).join(", ")}`
    );
    this.name = "MergeConflictError";
  }
}

const relationshipRow = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  type: z.string(),
  status: z.string(),
  decisionId: z.string().nullable(),
});

/**
 * Everything a merge changed, stored on ConceptMergeRecord.snapshot so REVERT can put it back.
 */
const MergeSnapshotSchema = z.object({
  concept: z.object({
    status: z.string(),
    mergedIntoId: z.string().nullable(),
  }),
  movedEntryIds: z.array(z.string()),
  deprecatedEntries: z.array(
    z.object({ id: z.string(), previous: z.string() })
  ),
  movedRelationships: z.array(
    z.object({ id: z.string(), sourceId: z.string(), targetId: z.string() })
  ),
  deletedRelationships: z.array(relationshipRow),
  movedClassificationIds: z.array(z.string()),
  deletedClassifications: z.array(
    z.object({
      kind: z.string(),
      key: z.string(),
      value: z.string(),
      source: z.string(),
      note: z.string().nullable(),
    })
  ),
  mergedAttributes: z.array(
    z.object({ attributeValueId: z.string(), source: z.string() })
  ),
  addedSurvivorAttributeIds: z.array(z.string()),
  mergedApplicability: z.array(z.string()),
  addedSurvivorApplicability: z.array(z.string()),
  mentionIds: z.array(z.string()),
  legacyMappingIds: z.array(z.string()),
  productIds: z.array(z.string()),
  movedSubstitutions: z.array(
    z.object({
      id: z.string(),
      fromConceptId: z.string(),
      toConceptId: z.string(),
    })
  ),
  deletedSubstitutions: z.array(
    z.object({
      fromConceptId: z.string(),
      toConceptId: z.string(),
      ratio: z.string().nullable(),
      note: z.string().nullable(),
    })
  ),
  addedSurvivorTagIds: z.array(z.string()),
});

type MergeSnapshot = z.infer<typeof MergeSnapshotSchema>;

/**
 * Merges `mergedId` into `survivorId` in the caller's transaction (Phase 4g): entries, relationships, classifications, attributes, applicability, mentions (verified ones too, since a merge keeps identity), legacy mappings, products, substitutions, and tags move to the survivor; the merged concept becomes DEPRECATED with `mergedIntoId`. Conflicting classifications abort with `MergeConflictError`, and a merge that would loop the hierarchy aborts with `OntologyError`. Returns the ConceptMergeRecord id.
 *
 * @example
 * await mergeConcepts(tx, { survivorId: scallion, mergedId: greenOnion, decisionId })
 */
export async function mergeConcepts(
  tx: DbClient,
  {
    survivorId,
    mergedId,
    decisionId,
  }: { survivorId: string; mergedId: string; decisionId: string }
): Promise<string> {
  if (survivorId === mergedId)
    throw new OntologyError("A concept cannot be merged into itself");
  const [survivor, merged] = await Promise.all([
    tx.foodConcept.findUnique({
      where: { id: survivorId },
      select: { id: true, status: true },
    }),
    tx.foodConcept.findUnique({
      where: { id: mergedId },
      select: { id: true, status: true, mergedIntoId: true },
    }),
  ]);
  if (!survivor || !merged)
    throw new OntologyError("Both concepts must exist to merge them");
  if (survivor.status === "DEPRECATED" || merged.status === "DEPRECATED")
    throw new OntologyError("Deprecated concepts cannot take part in a merge");

  const snapshot: MergeSnapshot = {
    concept: { status: merged.status, mergedIntoId: merged.mergedIntoId },
    movedEntryIds: [],
    deprecatedEntries: [],
    movedRelationships: [],
    deletedRelationships: [],
    movedClassificationIds: [],
    deletedClassifications: [],
    mergedAttributes: [],
    addedSurvivorAttributeIds: [],
    mergedApplicability: [],
    addedSurvivorApplicability: [],
    mentionIds: [],
    legacyMappingIds: [],
    productIds: [],
    movedSubstitutions: [],
    deletedSubstitutions: [],
    addedSurvivorTagIds: [],
  };

  // Classifications first: a conflict aborts before anything moves.
  const [survivorClassifications, mergedClassifications] = await Promise.all([
    tx.foodClassification.findMany({ where: { conceptId: survivorId } }),
    tx.foodClassification.findMany({ where: { conceptId: mergedId } }),
  ]);
  const survivorByKey = new Map(
    survivorClassifications.map((row) => [row.key, row])
  );
  const conflicts = mergedClassifications.flatMap((row) => {
    const existing = survivorByKey.get(row.key);
    return existing &&
      existing.value !== row.value &&
      existing.value !== "UNKNOWN" &&
      row.value !== "UNKNOWN"
      ? [
          {
            key: row.key,
            survivorValue: existing.value,
            mergedValue: row.value,
          },
        ]
      : [];
  });
  if (conflicts.length > 0) throw new MergeConflictError(conflicts);
  for (const row of mergedClassifications) {
    if (survivorByKey.has(row.key)) {
      snapshot.deletedClassifications.push({
        kind: row.kind,
        key: row.key,
        value: row.value,
        source: row.source,
        note: row.note,
      });
      await tx.foodClassification.delete({ where: { id: row.id } });
    } else {
      snapshot.movedClassificationIds.push(row.id);
      await tx.foodClassification.update({
        where: { id: row.id },
        data: { conceptId: survivorId },
      });
    }
  }

  // Entries: re-point unless the survivor already has the same text.
  const entries = await tx.lexiconEntry.findMany({
    where: { conceptId: mergedId },
    select: { id: true, matchKey: true, status: true },
  });
  const survivorTarget = `food:${survivorId}`;
  for (const entry of entries) {
    const duplicate = await tx.lexiconEntry.findUnique({
      where: {
        matchKey_targetKey: {
          matchKey: entry.matchKey,
          targetKey: survivorTarget,
        },
      },
      select: { id: true },
    });
    if (duplicate) {
      if (entry.status !== "DEPRECATED") {
        snapshot.deprecatedEntries.push({
          id: entry.id,
          previous: entry.status,
        });
        await tx.lexiconEntry.update({
          where: { id: entry.id },
          data: { status: "DEPRECATED" },
        });
      }
    } else {
      snapshot.movedEntryIds.push(entry.id);
      await tx.lexiconEntry.update({
        where: { id: entry.id },
        data: { conceptId: survivorId, targetKey: survivorTarget },
      });
    }
  }

  // Relationships: drop self-loops and duplicates, then check the hierarchy.
  const edges = await tx.foodRelationship.findMany({
    where: { OR: [{ sourceId: mergedId }, { targetId: mergedId }] },
  });
  for (const edge of edges) {
    const sourceId = edge.sourceId === mergedId ? survivorId : edge.sourceId;
    const targetId = edge.targetId === mergedId ? survivorId : edge.targetId;
    const duplicate =
      sourceId === targetId ||
      (await tx.foodRelationship.findUnique({
        where: {
          sourceId_targetId_type: { sourceId, targetId, type: edge.type },
        },
        select: { id: true },
      })) !== null;
    if (duplicate) {
      snapshot.deletedRelationships.push({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.type,
        status: edge.status,
        decisionId: edge.decisionId,
      });
      await tx.foodRelationship.delete({ where: { id: edge.id } });
    } else {
      snapshot.movedRelationships.push({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
      });
      await tx.foodRelationship.update({
        where: { id: edge.id },
        data: { sourceId, targetId },
      });
    }
  }
  await assertNoHierarchyCycle(tx, survivorId);

  // Attributes and applicability: union onto the survivor.
  const [mergedAttributes, survivorAttributes] = await Promise.all([
    tx.conceptAttribute.findMany({ where: { conceptId: mergedId } }),
    tx.conceptAttribute.findMany({
      where: { conceptId: survivorId },
      select: { attributeValueId: true },
    }),
  ]);
  const survivorAttributeIds = new Set(
    survivorAttributes.map((row) => row.attributeValueId)
  );
  snapshot.mergedAttributes = mergedAttributes.map((row) => ({
    attributeValueId: row.attributeValueId,
    source: row.source,
  }));
  snapshot.addedSurvivorAttributeIds = mergedAttributes
    .map((row) => row.attributeValueId)
    .filter((id) => !survivorAttributeIds.has(id));
  if (snapshot.addedSurvivorAttributeIds.length > 0) {
    await tx.conceptAttribute.createMany({
      data: mergedAttributes
        .filter((row) => !survivorAttributeIds.has(row.attributeValueId))
        .map((row) => ({
          conceptId: survivorId,
          attributeValueId: row.attributeValueId,
          source: row.source,
        })),
    });
  }
  await tx.conceptAttribute.deleteMany({ where: { conceptId: mergedId } });

  const [mergedApplicability, survivorApplicability] = await Promise.all([
    tx.attributeApplicability.findMany({
      where: { conceptId: mergedId },
      select: { definitionId: true },
    }),
    tx.attributeApplicability.findMany({
      where: { conceptId: survivorId },
      select: { definitionId: true },
    }),
  ]);
  const survivorDefinitions = new Set(
    survivorApplicability.map((row) => row.definitionId)
  );
  snapshot.mergedApplicability = mergedApplicability.map(
    (row) => row.definitionId
  );
  snapshot.addedSurvivorApplicability = snapshot.mergedApplicability.filter(
    (id) => !survivorDefinitions.has(id)
  );
  if (snapshot.addedSurvivorApplicability.length > 0) {
    await tx.attributeApplicability.createMany({
      data: snapshot.addedSurvivorApplicability.map((definitionId) => ({
        definitionId,
        conceptId: survivorId,
      })),
    });
  }
  await tx.attributeApplicability.deleteMany({
    where: { conceptId: mergedId },
  });

  // References: mentions, legacy mappings, products.
  const [mentions, mappings, products] = await Promise.all([
    tx.ingredientMention.findMany({
      where: { conceptId: mergedId },
      select: { id: true },
    }),
    tx.legacyIngredientMapping.findMany({
      where: { conceptId: mergedId },
      select: { legacyIngredientId: true },
    }),
    tx.foodProduct.findMany({
      where: { conceptId: mergedId },
      select: { id: true },
    }),
  ]);
  snapshot.mentionIds = mentions.map((row) => row.id);
  snapshot.legacyMappingIds = mappings.map((row) => row.legacyIngredientId);
  snapshot.productIds = products.map((row) => row.id);
  await tx.ingredientMention.updateMany({
    where: { conceptId: mergedId },
    data: { conceptId: survivorId },
  });
  await tx.legacyIngredientMapping.updateMany({
    where: { conceptId: mergedId },
    data: { conceptId: survivorId },
  });
  await tx.foodProduct.updateMany({
    where: { conceptId: mergedId },
    data: { conceptId: survivorId },
  });

  // Substitutions: drop self-substitutions and duplicates.
  const substitutions = await tx.foodSubstitution.findMany({
    where: { OR: [{ fromConceptId: mergedId }, { toConceptId: mergedId }] },
  });
  for (const row of substitutions) {
    const fromConceptId =
      row.fromConceptId === mergedId ? survivorId : row.fromConceptId;
    const toConceptId =
      row.toConceptId === mergedId ? survivorId : row.toConceptId;
    const duplicate =
      fromConceptId === toConceptId ||
      (await tx.foodSubstitution.findUnique({
        where: { fromConceptId_toConceptId: { fromConceptId, toConceptId } },
        select: { id: true },
      })) !== null;
    if (duplicate) {
      snapshot.deletedSubstitutions.push({
        fromConceptId: row.fromConceptId,
        toConceptId: row.toConceptId,
        ratio: row.ratio,
        note: row.note,
      });
      await tx.foodSubstitution.delete({ where: { id: row.id } });
    } else {
      snapshot.movedSubstitutions.push({
        id: row.id,
        fromConceptId: row.fromConceptId,
        toConceptId: row.toConceptId,
      });
      await tx.foodSubstitution.update({
        where: { id: row.id },
        data: { fromConceptId, toConceptId },
      });
    }
  }

  // Tags: the survivor gains the merged concept's tags.
  const [mergedTags, survivorTags] = await Promise.all([
    tx.foodConcept.findUnique({
      where: { id: mergedId },
      select: { tags: { select: { id: true } } },
    }),
    tx.foodConcept.findUnique({
      where: { id: survivorId },
      select: { tags: { select: { id: true } } },
    }),
  ]);
  const survivorTagIds = new Set(survivorTags?.tags.map((tag) => tag.id) ?? []);
  snapshot.addedSurvivorTagIds = (mergedTags?.tags ?? [])
    .map((tag) => tag.id)
    .filter((id) => !survivorTagIds.has(id));
  if (snapshot.addedSurvivorTagIds.length > 0) {
    await tx.foodConcept.update({
      where: { id: survivorId },
      data: {
        tags: { connect: snapshot.addedSurvivorTagIds.map((id) => ({ id })) },
      },
    });
  }

  await tx.foodConcept.update({
    where: { id: mergedId },
    data: { status: "DEPRECATED", mergedIntoId: survivorId },
  });

  const record = await tx.conceptMergeRecord.create({
    data: { survivorId, mergedId, decisionId, snapshot: toJson(snapshot) },
    select: { id: true },
  });
  return record.id;
}

/**
 * Puts a merge back from its ConceptMergeRecord snapshot, in the caller's transaction. Used by REVERT.
 *
 * @example
 * await undoMerge(tx, mergeRecordId)
 */
export async function undoMerge(
  tx: DbClient,
  mergeRecordId: string
): Promise<void> {
  const record = await tx.conceptMergeRecord.findUnique({
    where: { id: mergeRecordId },
  });
  if (!record) throw new OntologyError("That merge record no longer exists");
  const snapshot = parseOrThrow(
    MergeSnapshotSchema,
    record.snapshot,
    "ConceptMergeRecord.snapshot"
  );
  const { survivorId, mergedId } = record;

  await tx.foodConcept.update({
    where: { id: mergedId },
    data: {
      status: snapshot.concept.status as ConceptStatus,
      mergedIntoId: snapshot.concept.mergedIntoId,
    },
  });

  for (const id of snapshot.movedEntryIds) {
    await tx.lexiconEntry.update({
      where: { id },
      data: { conceptId: mergedId, targetKey: `food:${mergedId}` },
    });
  }
  for (const entry of snapshot.deprecatedEntries) {
    await tx.lexiconEntry.update({
      where: { id: entry.id },
      data: { status: entry.previous as EntryStatus },
    });
  }

  for (const edge of snapshot.movedRelationships) {
    await tx.foodRelationship.update({
      where: { id: edge.id },
      data: { sourceId: edge.sourceId, targetId: edge.targetId },
    });
  }
  if (snapshot.deletedRelationships.length > 0) {
    await tx.foodRelationship.createMany({
      data: snapshot.deletedRelationships.map((edge) => ({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.type as FoodRelationshipType,
        status: edge.status as EntryStatus,
        decisionId: edge.decisionId,
      })),
      skipDuplicates: true,
    });
  }

  if (snapshot.movedClassificationIds.length > 0) {
    await tx.foodClassification.updateMany({
      where: { id: { in: snapshot.movedClassificationIds } },
      data: { conceptId: mergedId },
    });
  }
  if (snapshot.deletedClassifications.length > 0) {
    await tx.foodClassification.createMany({
      data: snapshot.deletedClassifications.map((row) => ({
        conceptId: mergedId,
        kind: row.kind as Prisma.FoodClassificationCreateManyInput["kind"],
        key: row.key,
        value: row.value as TriState,
        source: row.source as ValueSource,
        note: row.note,
      })),
    });
  }

  if (snapshot.addedSurvivorAttributeIds.length > 0) {
    await tx.conceptAttribute.deleteMany({
      where: {
        conceptId: survivorId,
        attributeValueId: { in: snapshot.addedSurvivorAttributeIds },
      },
    });
  }
  if (snapshot.mergedAttributes.length > 0) {
    await tx.conceptAttribute.createMany({
      data: snapshot.mergedAttributes.map((row) => ({
        conceptId: mergedId,
        attributeValueId: row.attributeValueId,
        source: row.source as ValueSource,
      })),
      skipDuplicates: true,
    });
  }
  if (snapshot.addedSurvivorApplicability.length > 0) {
    await tx.attributeApplicability.deleteMany({
      where: {
        conceptId: survivorId,
        definitionId: { in: snapshot.addedSurvivorApplicability },
      },
    });
  }
  if (snapshot.mergedApplicability.length > 0) {
    await tx.attributeApplicability.createMany({
      data: snapshot.mergedApplicability.map((definitionId) => ({
        definitionId,
        conceptId: mergedId,
      })),
      skipDuplicates: true,
    });
  }

  if (snapshot.mentionIds.length > 0)
    await tx.ingredientMention.updateMany({
      where: { id: { in: snapshot.mentionIds } },
      data: { conceptId: mergedId },
    });
  if (snapshot.legacyMappingIds.length > 0)
    await tx.legacyIngredientMapping.updateMany({
      where: { legacyIngredientId: { in: snapshot.legacyMappingIds } },
      data: { conceptId: mergedId },
    });
  if (snapshot.productIds.length > 0)
    await tx.foodProduct.updateMany({
      where: { id: { in: snapshot.productIds } },
      data: { conceptId: mergedId },
    });

  for (const row of snapshot.movedSubstitutions) {
    await tx.foodSubstitution.update({
      where: { id: row.id },
      data: { fromConceptId: row.fromConceptId, toConceptId: row.toConceptId },
    });
  }
  if (snapshot.deletedSubstitutions.length > 0) {
    await tx.foodSubstitution.createMany({
      data: snapshot.deletedSubstitutions,
      skipDuplicates: true,
    });
  }

  if (snapshot.addedSurvivorTagIds.length > 0) {
    await tx.foodConcept.update({
      where: { id: survivorId },
      data: {
        tags: {
          disconnect: snapshot.addedSurvivorTagIds.map((id) => ({ id })),
        },
      },
    });
  }
}

async function assertNoHierarchyCycle(
  tx: DbClient,
  conceptId: string
): Promise<void> {
  const edges = await tx.foodRelationship.findMany({
    where: {
      type: { in: [...HIERARCHICAL_RELATIONSHIP_TYPES] },
      status: { not: "DEPRECATED" },
    },
    select: { sourceId: true, targetId: true },
  });
  const parents = new Map<string, string[]>();
  for (const edge of edges)
    parents.set(edge.sourceId, [
      ...(parents.get(edge.sourceId) ?? []),
      edge.targetId,
    ]);
  const seen = new Set<string>();
  const queue = [...(parents.get(conceptId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (id === conceptId)
      throw new OntologyError(
        "This merge would create a cycle in the hierarchy"
      );
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(parents.get(id) ?? []));
  }
}

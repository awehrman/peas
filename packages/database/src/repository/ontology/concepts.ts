import { getEffectiveClassifications } from "./classifications.js";
import {
  type DbClient,
  OntologyError,
  isUniqueViolation,
  nextFreeSlug,
  slugify,
} from "./helpers.js";

import type { EffectiveClassification } from "@peas/parser/v2";
import type {
  ConceptStatus,
  EntryStatus,
  FoodRelationshipType,
  LexiconRole,
  LexiconTermKind,
} from "@prisma/client";

import { prisma } from "../../client.js";

/**
 * @example
 * { canonicalName: "chicken thigh", status: "VERIFIED" }
 * { canonicalName: "garam masala", isComposed: true, composedRecipeId: "<recipe cuid>" }
 */
export interface ConceptCreateInput {
  canonicalName: string;
  status?: ConceptStatus;
  description?: string | null;
  isComposed?: boolean;
  composedRecipeId?: string | null;
}

/**
 * Creates a concept with a unique slug ("apple", then "apple-2", ...).
 *
 * @example
 * await createConcept(tx, { canonicalName: "Granny Smith Apple" }) // { id: "0193...", slug: "granny-smith-apple" }
 */
export async function createConcept(
  tx: DbClient,
  input: ConceptCreateInput
): Promise<{ id: string; slug: string }> {
  const canonicalName = input.canonicalName.trim();
  if (!canonicalName)
    throw new OntologyError("A concept needs a canonical name");

  const base = slugify(canonicalName);
  const taken = await tx.foodConcept.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const slug = nextFreeSlug(
    base,
    taken.map((row) => row.slug)
  );

  try {
    return await tx.foodConcept.create({
      data: {
        canonicalName,
        slug,
        status: input.status ?? "PROPOSED",
        description: input.description ?? null,
        isComposed: input.isComposed ?? false,
        composedRecipeId: input.composedRecipeId ?? null,
      },
      select: { id: true, slug: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new OntologyError(
        `The slug "${slug}" was taken concurrently; try again`
      );
    }
    throw error;
  }
}

export interface ConceptEntryRecord {
  id: string;
  text: string;
  role: LexiconRole;
  kind: LexiconTermKind | null;
  status: EntryStatus;
}

export interface ConceptRelationshipRecord {
  id: string;
  type: FoodRelationshipType;
  status: EntryStatus;
  conceptId: string;
  canonicalName: string;
}

export interface ConceptDetailRecord {
  id: string;
  canonicalName: string;
  slug: string;
  status: ConceptStatus;
  description: string | null;
  isComposed: boolean;
  composedRecipeId: string | null;
  mergedIntoId: string | null;
  entries: ConceptEntryRecord[];
  /** Edges where this concept is the more specific side, e.g. chicken thigh PART_OF chicken. */
  parents: ConceptRelationshipRecord[];
  /** Edges where this concept is the more general side. */
  children: ConceptRelationshipRecord[];
  attributes: {
    attributeValueId: string;
    definitionKey: string;
    valueKey: string;
    label: string;
  }[];
  classifications: EffectiveClassification[];
  /** Explicit classification keys, so the editor knows which values it can remove. */
  explicitClassificationKeys: string[];
  tags: string[];
  /** Concepts that can stand in for this one. */
  substitutions: {
    conceptId: string;
    canonicalName: string;
    ratio: string | null;
    note: string | null;
  }[];
}

/**
 * Everything the concept page needs, including inherited classifications.
 *
 * @example
 * const detail = await getConceptDetail(chickenThighId);
 * // detail.parents -> [{ type: "PART_OF", canonicalName: "chicken", ... }]
 * // detail.classifications -> [{ key: "POULTRY", value: "TRUE", source: "INHERITED", ... }]
 */
export async function getConceptDetail(
  id: string,
  db: DbClient = prisma
): Promise<ConceptDetailRecord | null> {
  const concept = await db.foodConcept.findUnique({
    where: { id },
    include: {
      entries: {
        where: { status: { not: "DEPRECATED" } },
        orderBy: [{ role: "asc" }, { text: "asc" }],
        select: { id: true, text: true, role: true, kind: true, status: true },
      },
      outgoing: {
        where: { status: { not: "DEPRECATED" } },
        include: { target: { select: { id: true, canonicalName: true } } },
      },
      incoming: {
        where: { status: { not: "DEPRECATED" } },
        include: { source: { select: { id: true, canonicalName: true } } },
      },
      attributes: {
        include: {
          attributeValue: {
            include: { definition: { select: { key: true } } },
          },
        },
      },
      classifications: { select: { key: true }, orderBy: { key: "asc" } },
      tags: { select: { name: true }, orderBy: { name: "asc" } },
      substitutionsFrom: {
        include: { toConcept: { select: { id: true, canonicalName: true } } },
        orderBy: { toConcept: { canonicalName: "asc" } },
      },
    },
  });
  if (!concept) return null;

  return {
    id: concept.id,
    canonicalName: concept.canonicalName,
    slug: concept.slug,
    status: concept.status,
    description: concept.description,
    isComposed: concept.isComposed,
    composedRecipeId: concept.composedRecipeId,
    mergedIntoId: concept.mergedIntoId,
    entries: concept.entries,
    parents: concept.outgoing.map((edge) => ({
      id: edge.id,
      type: edge.type,
      status: edge.status,
      conceptId: edge.target.id,
      canonicalName: edge.target.canonicalName,
    })),
    children: concept.incoming.map((edge) => ({
      id: edge.id,
      type: edge.type,
      status: edge.status,
      conceptId: edge.source.id,
      canonicalName: edge.source.canonicalName,
    })),
    attributes: concept.attributes.map((attribute) => ({
      attributeValueId: attribute.attributeValueId,
      definitionKey: attribute.attributeValue.definition.key,
      valueKey: attribute.attributeValue.key,
      label: attribute.attributeValue.label,
    })),
    classifications: await getEffectiveClassifications(concept.id, db),
    explicitClassificationKeys: concept.classifications.map((row) => row.key),
    tags: concept.tags.map((tag) => tag.name),
    substitutions: concept.substitutionsFrom.map((substitution) => ({
      conceptId: substitution.toConcept.id,
      canonicalName: substitution.toConcept.canonicalName,
      ratio: substitution.ratio,
      note: substitution.note,
    })),
  };
}

export interface ConceptSearchResult {
  id: string;
  canonicalName: string;
  slug: string;
  status: ConceptStatus;
}

/**
 * Case-insensitive substring search over canonical names and FOOD entry text. Deprecated concepts are excluded unless asked for.
 *
 * @example
 * await searchConcepts("thigh") // [{ canonicalName: "chicken thigh", ... }]
 */
export async function searchConcepts(
  query: string,
  {
    limit = 20,
    includeDeprecated = false,
  }: { limit?: number; includeDeprecated?: boolean } = {},
  db: DbClient = prisma
): Promise<ConceptSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return db.foodConcept.findMany({
    where: {
      ...(includeDeprecated ? {} : { status: { not: "DEPRECATED" } }),
      OR: [
        { canonicalName: { contains: trimmed, mode: "insensitive" } },
        {
          entries: {
            some: {
              role: "FOOD",
              status: { not: "DEPRECATED" },
              normalized: { contains: trimmed, mode: "insensitive" },
            },
          },
        },
      ],
    },
    orderBy: { canonicalName: "asc" },
    take: limit,
    select: { id: true, canonicalName: true, slug: true, status: true },
  });
}

/**
 * @example
 * await setConceptStatus(tx, conceptId, "VERIFIED")
 */
export async function setConceptStatus(
  tx: DbClient,
  id: string,
  status: ConceptStatus
): Promise<void> {
  await tx.foodConcept.update({ where: { id }, data: { status } });
}

export interface ConceptListItem {
  id: string;
  canonicalName: string;
  slug: string;
  status: ConceptStatus;
  entryCount: number;
  mentionCount: number;
}

/**
 * One page of concepts for the concepts list, alphabetical, optionally filtered by name or FOOD entry text and status. Deprecated (merged) concepts are hidden unless asked for by status.
 *
 * @example
 * await listConcepts({ query: "sugar", limit: 50 }) // { items: [{ canonicalName: "powdered sugar", entryCount: 3, mentionCount: 12, ... }], total: 4 }
 */
export async function listConcepts(
  {
    query,
    status,
    offset = 0,
    limit = 50,
  }: {
    query?: string;
    status?: ConceptStatus;
    offset?: number;
    limit?: number;
  } = {},
  db: DbClient = prisma
): Promise<{ items: ConceptListItem[]; total: number }> {
  const trimmed = query?.trim();
  const where = {
    ...(status ? { status } : { status: { not: "DEPRECATED" as const } }),
    ...(trimmed
      ? {
          OR: [
            {
              canonicalName: {
                contains: trimmed,
                mode: "insensitive" as const,
              },
            },
            {
              entries: {
                some: {
                  role: "FOOD" as const,
                  status: { not: "DEPRECATED" as const },
                  normalized: {
                    contains: trimmed,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.foodConcept.findMany({
      where,
      orderBy: [{ canonicalName: "asc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        canonicalName: true,
        slug: true,
        status: true,
        _count: {
          select: {
            entries: { where: { status: { not: "DEPRECATED" } } },
            mentions: true,
          },
        },
      },
    }),
    db.foodConcept.count({ where }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      canonicalName: row.canonicalName,
      slug: row.slug,
      status: row.status,
      entryCount: row._count.entries,
      mentionCount: row._count.mentions,
    })),
    total,
  };
}

export interface ConceptMentionExample {
  mentionId: string;
  rawText: string;
  lineText: string;
  noteId: string | null;
  noteTitle: string | null;
  verified: boolean;
}

/**
 * @example
 * await getConceptMentions(conceptId, { limit: 10 }) // [{ lineText: "1 lb boneless chicken thighs", noteTitle: "Weeknight Chili", verified: false }]
 */
export async function getConceptMentions(
  conceptId: string,
  { limit = 10 }: { limit?: number } = {},
  db: DbClient = prisma
): Promise<ConceptMentionExample[]> {
  const rows = await db.ingredientMention.findMany({
    where: { conceptId },
    orderBy: { id: "desc" },
    take: limit,
    select: {
      id: true,
      rawText: true,
      verifiedAt: true,
      parsedLine: {
        select: {
          reference: true,
          noteId: true,
          Note: { select: { title: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    mentionId: row.id,
    rawText: row.rawText,
    lineText: row.parsedLine.reference,
    noteId: row.parsedLine.noteId,
    noteTitle: row.parsedLine.Note?.title ?? null,
    verified: row.verifiedAt !== null,
  }));
}

export interface ConceptDecisionRecord {
  id: string;
  type: string;
  revision: number;
  createdAt: string;
  username: string;
  revertedById: string | null;
  /** True for decisions that a REVERT can undo (not reverts, not already reverted). */
  canRevert: boolean;
}

/**
 * Decisions that touched a concept: created its entries or relationships, merged it, or name it in their payload.
 *
 * @example
 * await getConceptDecisions(conceptId) // [{ type: "MAP_TO_CONCEPT", revision: 14, username: "allie", canRevert: true }]
 */
export async function getConceptDecisions(
  conceptId: string,
  { limit = 25 }: { limit?: number } = {},
  db: DbClient = prisma
): Promise<ConceptDecisionRecord[]> {
  const rows = await db.lexiconDecision.findMany({
    where: {
      OR: [
        { entries: { some: { conceptId } } },
        {
          relationships: {
            some: { OR: [{ sourceId: conceptId }, { targetId: conceptId }] },
          },
        },
        {
          merges: {
            some: { OR: [{ survivorId: conceptId }, { mergedId: conceptId }] },
          },
        },
        { payload: { path: ["conceptId"], equals: conceptId } },
      ],
    },
    orderBy: { revision: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      revision: true,
      createdAt: true,
      revertedById: true,
      user: { select: { username: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    username: row.user.username,
    revertedById: row.revertedById,
    canRevert: row.type !== "REVERT" && row.revertedById === null,
  }));
}

export interface ConceptRefRecord {
  id: string;
  canonicalName: string;
  status: ConceptStatus;
}

/**
 * Names and statuses for a set of concept ids (deprecated ones included), for labelling ids in payloads.
 *
 * @example
 * await getConceptRefs([id]) // [{ id, canonicalName: "powdered sugar", status: "VERIFIED" }]
 */
export async function getConceptRefs(
  ids: readonly string[],
  db: DbClient = prisma
): Promise<ConceptRefRecord[]> {
  if (ids.length === 0) return [];
  return db.foodConcept.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, canonicalName: true, status: true },
  });
}

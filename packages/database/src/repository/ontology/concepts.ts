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

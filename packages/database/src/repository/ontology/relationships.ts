import { type DbClient, OntologyError, isUniqueViolation } from "./helpers.js";

import {
  FOOD_RELATIONSHIP_TYPES,
  HIERARCHICAL_RELATIONSHIP_TYPES,
} from "@peas/parser/v2";
import {
  type EntryStatus,
  type FoodRelationshipType,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../client.js";

/** Guards recursive walks against cycles in non-hierarchical relationship types. */
const MAX_WALK_DEPTH = 25;

/**
 * @example
 * { sourceId: "<granny smith apple>", targetId: "<apple>", type: "IS_A" }
 */
export interface RelationshipCreateInput {
  sourceId: string;
  targetId: string;
  type: FoodRelationshipType;
  status?: EntryStatus;
  decisionId?: string | null;
}

/**
 * Adds an edge in the caller's transaction. IS_A and PART_OF edges must keep the hierarchy acyclic: the edge is rejected when the source is already an ancestor of the target.
 *
 * @example
 * await addRelationship(tx, { sourceId: thigh, targetId: chicken, type: "PART_OF" }) // ok
 * await addRelationship(tx, { sourceId: chicken, targetId: thigh, type: "IS_A" })    // OntologyError: would create a cycle
 */
export async function addRelationship(
  tx: DbClient,
  input: RelationshipCreateInput
): Promise<{ id: string }> {
  if (input.sourceId === input.targetId) {
    throw new OntologyError("A concept cannot relate to itself");
  }

  if (HIERARCHICAL_RELATIONSHIP_TYPES.includes(input.type)) {
    const [row] = await tx.$queryRaw<{ hasCycle: boolean }[]>`
      WITH RECURSIVE ancestors(id, depth) AS (
        SELECT r."targetId", 1
        FROM "FoodRelationship" r
        WHERE r."sourceId" = ${input.targetId}::uuid
          AND r.type::text IN (${Prisma.join(HIERARCHICAL_RELATIONSHIP_TYPES)})
          AND r.status <> 'DEPRECATED'
        UNION
        SELECT r."targetId", a.depth + 1
        FROM "FoodRelationship" r
        JOIN ancestors a ON r."sourceId" = a.id
        WHERE r.type::text IN (${Prisma.join(HIERARCHICAL_RELATIONSHIP_TYPES)})
          AND r.status <> 'DEPRECATED'
          AND a.depth < ${MAX_WALK_DEPTH}
      )
      SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = ${input.sourceId}::uuid) AS "hasCycle"
    `;
    if (row?.hasCycle) {
      throw new OntologyError(
        `Adding this ${input.type} relationship would create a cycle in the hierarchy`
      );
    }
  }

  try {
    return await tx.foodRelationship.create({
      data: {
        sourceId: input.sourceId,
        targetId: input.targetId,
        type: input.type,
        status: input.status ?? "PROPOSED",
        decisionId: input.decisionId ?? null,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new OntologyError(`This ${input.type} relationship already exists`);
    throw error;
  }
}

/**
 * A concept reached by walking relationships, with the edge types along the shortest path (nearest edge first).
 *
 * @example
 * // ancestors of "chicken thigh"
 * { conceptId: "<chicken>", canonicalName: "chicken", path: ["PART_OF"], depth: 1 }
 * { conceptId: "<poultry>", canonicalName: "poultry", path: ["PART_OF", "IS_A"], depth: 2 }
 */
export interface RelatedConceptRecord {
  conceptId: string;
  canonicalName: string;
  path: FoodRelationshipType[];
  depth: number;
}

type WalkDirection = "UP" | "DOWN";

async function walk(
  conceptId: string,
  types: readonly FoodRelationshipType[],
  direction: WalkDirection,
  db: DbClient
): Promise<RelatedConceptRecord[]> {
  if (types.length === 0) return [];
  const from =
    direction === "UP" ? Prisma.raw(`"sourceId"`) : Prisma.raw(`"targetId"`);
  const to =
    direction === "UP" ? Prisma.raw(`"targetId"`) : Prisma.raw(`"sourceId"`);

  const rows = await db.$queryRaw<
    {
      conceptId: string;
      canonicalName: string;
      path: string[];
      depth: number;
    }[]
  >`
    WITH RECURSIVE walk(id, path, depth) AS (
      SELECT r.${to}, ARRAY[r.type::text], 1
      FROM "FoodRelationship" r
      WHERE r.${from} = ${conceptId}::uuid
        AND r.type::text IN (${Prisma.join([...types])})
        AND r.status <> 'DEPRECATED'
      UNION ALL
      SELECT r.${to}, w.path || r.type::text, w.depth + 1
      FROM "FoodRelationship" r
      JOIN walk w ON r.${from} = w.id
      WHERE r.type::text IN (${Prisma.join([...types])})
        AND r.status <> 'DEPRECATED'
        AND w.depth < ${MAX_WALK_DEPTH}
    )
    SELECT w.id::text AS "conceptId", c."canonicalName", w.path, w.depth
    FROM walk w
    JOIN "FoodConcept" c ON c.id = w.id
    WHERE w.id <> ${conceptId}::uuid
    ORDER BY w.depth, c."canonicalName"
  `;

  const nearest = new Map<string, RelatedConceptRecord>();
  for (const row of rows) {
    if (nearest.has(row.conceptId)) continue;
    nearest.set(row.conceptId, {
      conceptId: row.conceptId,
      canonicalName: row.canonicalName,
      path: row.path.filter((type): type is FoodRelationshipType =>
        (FOOD_RELATIONSHIP_TYPES as readonly string[]).includes(type)
      ),
      depth: Number(row.depth),
    });
  }
  return [...nearest.values()];
}

/**
 * More general or originating concepts, nearest first. Defaults to the hierarchy (IS_A, PART_OF).
 *
 * @example
 * await getAncestors(chickenThighId) // [chicken (PART_OF), poultry (PART_OF, IS_A)]
 */
export async function getAncestors(
  conceptId: string,
  types: readonly FoodRelationshipType[] = HIERARCHICAL_RELATIONSHIP_TYPES,
  db: DbClient = prisma
): Promise<RelatedConceptRecord[]> {
  return walk(conceptId, types, "UP", db);
}

/**
 * More specific concepts, nearest first.
 *
 * @example
 * await getDescendants(appleId) // [granny smith apple (IS_A), ...]
 */
export async function getDescendants(
  conceptId: string,
  types: readonly FoodRelationshipType[] = HIERARCHICAL_RELATIONSHIP_TYPES,
  db: DbClient = prisma
): Promise<RelatedConceptRecord[]> {
  return walk(conceptId, types, "DOWN", db);
}

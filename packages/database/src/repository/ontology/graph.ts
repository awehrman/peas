import type { DbClient } from "./helpers.js";

import { FOOD_RELATIONSHIP_TYPES } from "@peas/parser/v2";
import type {
  ConceptStatus,
  EntryStatus,
  FoodRelationshipType,
} from "@prisma/client";

import { prisma } from "../../client.js";

export const GRAPH_DIRECTIONS = ["UP", "DOWN", "BOTH"] as const;
export type GraphDirection = (typeof GRAPH_DIRECTIONS)[number];
export const MAX_GRAPH_DEPTH = 3;
export const MAX_GRAPH_NODES = 150;

/**
 * A food in the neighborhood. `level` is its signed distance from the center: negative above (more general), positive below (more specific), so a layered drawing can place it.
 *
 * @example
 * { id: "<chicken>", canonicalName: "chicken", status: "VERIFIED", level: -1, directMentions: 3 }
 */
export interface GraphNode {
  id: string;
  canonicalName: string;
  status: ConceptStatus;
  level: number;
  directMentions: number;
}

/**
 * A relationship from the more specific food (`sourceId`) to the more general or originating one (`targetId`), with the decision that created it when there is one.
 *
 * @example
 * { id: "0193...", sourceId: "<chicken thigh>", targetId: "<chicken>", type: "PART_OF", status: "ACTIVE", decision: { id: "0193...", type: "EDIT_CONCEPT", revision: 14, username: "allie", createdAt: "..." } }
 */
export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: FoodRelationshipType;
  status: EntryStatus;
  decision: {
    id: string;
    type: string;
    revision: number;
    username: string;
    createdAt: string;
  } | null;
}

export interface ConceptNeighborhood {
  centerId: string;
  depth: number;
  direction: GraphDirection;
  types: FoodRelationshipType[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** True when the node limit stopped the walk early. */
  truncated: boolean;
}

/**
 * The foods within `depth` relationship steps of a concept (Phase 8-E), walking up (more general), down (more specific), or both, through the chosen relationship types; never the whole graph. Breadth-first with one query per step; stops adding foods at 150 and says so. Retired (DEPRECATED) relationships are skipped, proposed ones are included and marked.
 *
 * @example
 * await getConceptNeighborhood(chickenId, { depth: 1 })
 * // { nodes: [{ canonicalName: "chicken", level: 0 }, { canonicalName: "chicken thigh", level: 1 }, ...], edges: [{ type: "PART_OF", ... }], truncated: false }
 */
export async function getConceptNeighborhood(
  centerId: string,
  {
    depth = 2,
    types = FOOD_RELATIONSHIP_TYPES,
    direction = "BOTH",
    limit = MAX_GRAPH_NODES,
  }: {
    depth?: number;
    types?: readonly FoodRelationshipType[];
    direction?: GraphDirection;
    limit?: number;
  } = {},
  db: DbClient = prisma
): Promise<ConceptNeighborhood | null> {
  const center = await db.foodConcept.findUnique({
    where: { id: centerId },
    select: { id: true },
  });
  if (!center) return null;

  const steps = Math.min(Math.max(depth, 1), MAX_GRAPH_DEPTH);
  const levels = new Map<string, number>([[centerId, 0]]);
  const edges = new Map<
    string,
    Omit<GraphEdge, "decision"> & { decisionId: string | null }
  >();
  let frontier = [centerId];
  let truncated = false;

  for (
    let step = 0;
    step < steps && frontier.length > 0 && types.length > 0;
    step += 1
  ) {
    const goUp = direction !== "DOWN";
    const goDown = direction !== "UP";
    const rows = await db.foodRelationship.findMany({
      where: {
        status: { not: "DEPRECATED" },
        type: { in: [...types] },
        OR: [
          ...(goUp ? [{ sourceId: { in: frontier } }] : []),
          ...(goDown ? [{ targetId: { in: frontier } }] : []),
        ],
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        sourceId: true,
        targetId: true,
        type: true,
        status: true,
        decisionId: true,
      },
    });
    const inFrontier = new Set(frontier);
    const next: string[] = [];
    for (const row of rows) {
      const upward = goUp && inFrontier.has(row.sourceId);
      const from = upward ? row.sourceId : row.targetId;
      const to = upward ? row.targetId : row.sourceId;
      if (!levels.has(to)) {
        if (levels.size >= limit) {
          truncated = true;
          continue;
        }
        levels.set(to, (levels.get(from) ?? 0) + (upward ? -1 : 1));
        next.push(to);
      }
      edges.set(row.id, row);
    }
    frontier = next;
  }

  const nodeIds = [...levels.keys()];
  const decisionIds = [
    ...new Set(
      [...edges.values()].flatMap((edge) =>
        edge.decisionId ? [edge.decisionId] : []
      )
    ),
  ];
  const [concepts, mentionCounts, decisions] = await Promise.all([
    db.foodConcept.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, canonicalName: true, status: true },
    }),
    db.ingredientMention.groupBy({
      by: ["conceptId"],
      where: {
        conceptId: { in: nodeIds },
        parsedLine: { isActive: true, Note: { archivedAt: null } },
      },
      _count: { _all: true },
    }),
    db.lexiconDecision.findMany({
      where: { id: { in: decisionIds } },
      select: {
        id: true,
        type: true,
        revision: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
  ]);
  const counts = new Map(
    mentionCounts.map((row) => [row.conceptId, row._count._all])
  );
  const decisionById = new Map(decisions.map((row) => [row.id, row]));

  return {
    centerId,
    depth: steps,
    direction,
    types: [...types],
    nodes: concepts
      .map((concept) => ({
        id: concept.id,
        canonicalName: concept.canonicalName,
        status: concept.status,
        level: levels.get(concept.id) ?? 0,
        directMentions: counts.get(concept.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          a.level - b.level || a.canonicalName.localeCompare(b.canonicalName)
      ),
    edges: [...edges.values()]
      .filter((edge) => levels.has(edge.sourceId) && levels.has(edge.targetId))
      .map(({ decisionId, ...edge }) => {
        const decision = decisionId ? decisionById.get(decisionId) : undefined;
        return {
          ...edge,
          decision: decision
            ? {
                id: decision.id,
                type: decision.type,
                revision: decision.revision,
                username: decision.user.username,
                createdAt: decision.createdAt.toISOString(),
              }
            : null,
        };
      }),
    truncated,
  };
}

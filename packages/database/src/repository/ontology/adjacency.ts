import { upsertDiscoveries } from "./discoveries.js";
import { type DbClient, parseOrThrow, toJson } from "./helpers.js";

import {
  DiscoveryPayloadSchema,
  type ResolverContext,
  entryMatchKey,
  suggestRelationships,
} from "@peas/parser/v2";

import { prisma } from "../../client.js";

/**
 * How often a word appears right before a head concept in stored mentions, counted per distinct note.
 *
 * @example
 * { conceptId: "<chicken thigh>", token: "boneless", role: "ATTRIBUTE", distinctNotes: 41 }
 */
export interface AdjacencyRow {
  conceptId: string;
  token: string;
  role: "UNKNOWN" | "ATTRIBUTE";
  distinctNotes: number;
}

/**
 * Counts which unknown and attribute words appear immediately before each mention's head concept (Phase 4b adjacency mining), reading the stored syntax with `jsonb_array_elements`. The head is the phrase lexeme holding the top candidate's entry.
 *
 * @example
 * await computeAdjacency({ minNotes: 2 }) // [{ conceptId, token: "boneless", role: "ATTRIBUTE", distinctNotes: 41 }, ...]
 */
export async function computeAdjacency(
  { minNotes = 1 }: { minNotes?: number } = {},
  db: DbClient = prisma
): Promise<AdjacencyRow[]> {
  const rows = await db.$queryRaw<AdjacencyRow[]>`
    WITH items AS (
      SELECT m.id,
             l."noteId" AS note_id,
             m.resolution->'candidates'->0->>'conceptId' AS concept_id,
             m.resolution->'candidates'->0->>'entryId' AS entry_id,
             t.item,
             t.ord
      FROM "IngredientMention" m
      JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId"
      CROSS JOIN LATERAL jsonb_array_elements(m.syntax->'segment'->'phrase') WITH ORDINALITY AS t(item, ord)
      WHERE m.resolution->'candidates'->0->>'entryId' IS NOT NULL
    ),
    ordered AS (
      SELECT *, LAG(item) OVER (PARTITION BY id ORDER BY ord) AS previous
      FROM items
    )
    SELECT concept_id AS "conceptId",
           lower(previous->'span'->>'text') AS token,
           CASE WHEN previous->>'kind' = 'UNKNOWN' THEN 'UNKNOWN' ELSE 'ATTRIBUTE' END AS role,
           COUNT(DISTINCT note_id)::int AS "distinctNotes"
    FROM ordered
    WHERE item->>'kind' = 'LEXEME'
      AND item->'entryIds' ? entry_id
      AND previous IS NOT NULL
      AND (previous->>'kind' = 'UNKNOWN' OR previous->'roles' ? 'ATTRIBUTE')
    GROUP BY 1, 2, 3
    HAVING COUNT(DISTINCT note_id) >= ${minNotes}
    ORDER BY "distinctNotes" DESC, token
  `;
  return rows.map((row) => ({
    ...row,
    distinctNotes: Number(row.distinctNotes),
  }));
}

export interface RefreshDiscoveriesResult {
  identityUpdated: number;
  modifiersUpdated: number;
  relationshipSuggestions: number;
}

/**
 * Feeds adjacency counts into open discoveries (IDENTITY_DECISION `cooccurrence`, UNKNOWN_MODIFIER `adjacentHeads`) and adds RELATIONSHIP_SUGGESTION discoveries for concepts whose name ends with another concept's name. Runs after each backfill and from the "Refresh discoveries" action.
 *
 * @example
 * await prisma.$transaction((tx) => refreshDiscoveries(tx, context))
 */
export async function refreshDiscoveries(
  tx: DbClient,
  context: ResolverContext
): Promise<RefreshDiscoveriesResult> {
  const adjacency = await computeAdjacency({ minNotes: 1 }, tx);
  const byConceptToken = new Map(
    adjacency.map((row) => [`${row.conceptId}|${row.token}`, row.distinctNotes])
  );
  const result: RefreshDiscoveriesResult = {
    identityUpdated: 0,
    modifiersUpdated: 0,
    relationshipSuggestions: 0,
  };

  const open = await tx.discovery.findMany({
    where: {
      status: "OPEN",
      type: { in: ["IDENTITY_DECISION", "UNKNOWN_MODIFIER"] },
    },
    select: { id: true, payload: true },
  });
  for (const row of open) {
    const payload = parseOrThrow(
      DiscoveryPayloadSchema,
      row.payload,
      "Discovery.payload"
    );
    if (payload.type === "IDENTITY_DECISION") {
      const modifierTexts = payload.modifierEntryIds.flatMap((id) => {
        const entry = context.entries.get(id);
        return entry ? [entryMatchKey(entry.text)] : [];
      });
      const cooccurrence = Math.max(
        0,
        ...modifierTexts.map(
          (text) => byConceptToken.get(`${payload.headConceptId}|${text}`) ?? 0
        )
      );
      if (cooccurrence !== payload.cooccurrence) {
        await tx.discovery.update({
          where: { id: row.id },
          data: { payload: toJson({ ...payload, cooccurrence }) },
        });
        result.identityUpdated += 1;
      }
    } else if (payload.type === "UNKNOWN_MODIFIER") {
      const token = payload.token.toLowerCase();
      const adjacentHeads = adjacency
        .filter((entry) => entry.role === "UNKNOWN" && entry.token === token)
        .slice(0, 5)
        .map((entry) => ({
          conceptId: entry.conceptId,
          distinctNotes: entry.distinctNotes,
        }));
      if (
        JSON.stringify(adjacentHeads) !==
        JSON.stringify(payload.adjacentHeads ?? [])
      ) {
        await tx.discovery.update({
          where: { id: row.id },
          data: { payload: toJson({ ...payload, adjacentHeads }) },
        });
        result.modifiersUpdated += 1;
      }
    }
  }

  const [concepts, relationships, existing] = await Promise.all([
    tx.foodConcept.findMany({
      where: { status: { not: "DEPRECATED" } },
      select: { id: true, canonicalName: true },
    }),
    tx.foodRelationship.findMany({
      where: { status: { not: "DEPRECATED" } },
      select: { sourceId: true, targetId: true },
    }),
    tx.discovery.findMany({
      where: { type: "RELATIONSHIP_SUGGESTION" },
      select: { key: true },
    }),
  ]);
  const known = new Set(existing.map((row) => row.key));
  const suggestions = suggestRelationships(
    context,
    concepts,
    relationships
  ).filter((suggestion) => !known.has(suggestion.key));
  if (suggestions.length > 0) {
    await upsertDiscoveries(
      tx,
      suggestions.map((suggestion) => ({ ...suggestion, evidence: [] })),
      context.revision
    );
  }
  result.relationshipSuggestions = suggestions.length;
  return result;
}

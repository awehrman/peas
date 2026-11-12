import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "./scoring.js";

import { z } from "zod";

import { LEXICON_ROLES } from "../ast/types.js";
import { type Lexicon, buildLexicon } from "../lexicon/token-trie.js";
import type { LexiconEntryInput } from "../lexicon/types.js";
import {
  CONCEPT_STATUSES,
  FOOD_RELATIONSHIP_TYPES,
  type FoodRelationshipType,
  HIERARCHICAL_RELATIONSHIP_TYPES,
  LEXICON_TERM_KINDS,
} from "../ontology/types.js";

/**
 * Everything the resolver needs, as plain data. Serializable so the queue can cache it in Redis by revision; the database builds it with `loadResolverSnapshot()`.
 *
 * @example
 * {
 *   revision: 12,
 *   entries: [{ id: "<e>", text: "chicken thighs", role: "FOOD", status: "ACTIVE", kind: "PLURAL", conceptId: "<chicken thigh>" }],
 *   vocabulary: { definitions: [{ id: "<bone>", key: "bone", name: "Bone", values: [{ id: "<boneless>", key: "boneless", label: "Boneless" }] }], preparations: [...] },
 *   concepts: [{ id: "<chicken thigh>", canonicalName: "chicken thigh", status: "VERIFIED" }],
 *   relationships: [{ sourceId: "<chicken thigh>", targetId: "<chicken>", type: "PART_OF" }],
 *   applicability: [{ definitionId: "<bone>", conceptId: "<chicken>" }],
 *   conceptAttributes: [],
 *   priorVerifiedShare: { "chicken thighs": { "<chicken thigh>": 1 } },
 * }
 */
export const ResolverSnapshotSchema = z.object({
  revision: z.number().int().nonnegative(),
  entries: z.array(
    z.object({
      id: z.uuid(),
      text: z.string().min(1),
      role: z.enum(LEXICON_ROLES),
      status: z.enum(["ACTIVE", "PROPOSED"]).optional(),
      kind: z.enum(LEXICON_TERM_KINDS).nullable().optional(),
      conceptId: z.uuid().nullable().optional(),
      attributeValueId: z.uuid().nullable().optional(),
      preparationId: z.uuid().nullable().optional(),
      valueKey: z.string().min(1).nullable().optional(),
    })
  ),
  vocabulary: z.object({
    definitions: z.array(
      z.object({
        id: z.uuid(),
        key: z.string().min(1),
        name: z.string(),
        values: z.array(
          z.object({ id: z.uuid(), key: z.string().min(1), label: z.string() })
        ),
      })
    ),
    preparations: z.array(
      z.object({ id: z.uuid(), key: z.string().min(1), label: z.string() })
    ),
  }),
  concepts: z.array(
    z.object({
      id: z.uuid(),
      canonicalName: z.string().min(1),
      status: z.enum(CONCEPT_STATUSES),
    })
  ),
  relationships: z.array(
    z.object({
      sourceId: z.uuid(),
      targetId: z.uuid(),
      type: z.enum(FOOD_RELATIONSHIP_TYPES),
    })
  ),
  applicability: z.array(
    z.object({ definitionId: z.uuid(), conceptId: z.uuid() })
  ),
  conceptAttributes: z.array(
    z.object({ conceptId: z.uuid(), attributeValueId: z.uuid() })
  ),
  /** Normalized head phrase -> concept id -> share of verified mentions that chose it. */
  priorVerifiedShare: z
    .record(z.string(), z.record(z.string(), z.number().min(0).max(1)))
    .default({}),
});

export type ResolverSnapshot = z.input<typeof ResolverSnapshotSchema>;

export interface AttributeValueInfo {
  id: string;
  key: string;
  label: string;
  definitionId: string;
  definitionKey: string;
}

export interface ConceptInfo {
  id: string;
  canonicalName: string;
  status: "PROPOSED" | "VERIFIED" | "DEPRECATED";
}

/** Read-only ontology queries over snapshot data, with no database access. */
export interface OntologyView {
  concept(id: string): ConceptInfo | undefined;
  /** More general concepts reachable through the given relationship types, nearest first. */
  ancestors(
    conceptId: string,
    types?: readonly FoodRelationshipType[]
  ): string[];
  /** More specific concepts reachable through the given relationship types, nearest first. */
  descendants(
    conceptId: string,
    types?: readonly FoodRelationshipType[]
  ): string[];
  /** Attribute dimensions that apply to the concept directly or through an IS_A / PART_OF ancestor. */
  applicableDefinitions(conceptId: string): ReadonlySet<string>;
  /** Attribute values that characterize the concept itself (e.g. canned tomatoes: preservation=canned). */
  conceptAttributes(conceptId: string): ReadonlySet<string>;
}

export interface ResolverContext {
  revision: number;
  lexicon: Lexicon;
  entries: ReadonlyMap<string, LexiconEntryInput>;
  attributeValues: ReadonlyMap<string, AttributeValueInfo>;
  preparations: ReadonlyMap<string, { id: string; key: string; label: string }>;
  ontology: OntologyView;
  priorVerifiedShare: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  config: ScoringConfig;
}

function walk(
  start: string,
  edges: ReadonlyMap<string, { next: string; type: FoodRelationshipType }[]>,
  types: readonly FoodRelationshipType[]
): string[] {
  const seen = new Set<string>([start]);
  const order: string[] = [];
  let frontier = [start];
  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const conceptId of frontier) {
      for (const edge of edges.get(conceptId) ?? []) {
        if (!types.includes(edge.type) || seen.has(edge.next)) continue;
        seen.add(edge.next);
        order.push(edge.next);
        nextFrontier.push(edge.next);
      }
    }
    frontier = nextFrontier;
  }
  return order;
}

/**
 * Builds the resolver's lookup structures once per snapshot. Cache the result by revision.
 *
 * @example
 * const context = buildResolverContext(await loadResolverSnapshot());
 * processIngredientLine("1 lb boneless chicken thighs", context);
 */
export function buildResolverContext(
  input: ResolverSnapshot,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ResolverContext {
  const snapshot = ResolverSnapshotSchema.parse(input);
  const entries: LexiconEntryInput[] = snapshot.entries.map((entry) => ({
    ...entry,
    status: entry.status ?? "ACTIVE",
  }));
  const lexicon = buildLexicon({ revision: snapshot.revision, entries });

  const attributeValues = new Map<string, AttributeValueInfo>();
  for (const definition of snapshot.vocabulary.definitions) {
    for (const value of definition.values) {
      attributeValues.set(value.id, {
        ...value,
        definitionId: definition.id,
        definitionKey: definition.key,
      });
    }
  }

  const up = new Map<string, { next: string; type: FoodRelationshipType }[]>();
  const down = new Map<
    string,
    { next: string; type: FoodRelationshipType }[]
  >();
  for (const relationship of snapshot.relationships) {
    up.set(relationship.sourceId, [
      ...(up.get(relationship.sourceId) ?? []),
      { next: relationship.targetId, type: relationship.type },
    ]);
    down.set(relationship.targetId, [
      ...(down.get(relationship.targetId) ?? []),
      { next: relationship.sourceId, type: relationship.type },
    ]);
  }

  const directApplicability = new Map<string, Set<string>>();
  for (const { conceptId, definitionId } of snapshot.applicability) {
    directApplicability.set(
      conceptId,
      (directApplicability.get(conceptId) ?? new Set()).add(definitionId)
    );
  }
  const ownAttributes = new Map<string, Set<string>>();
  for (const { conceptId, attributeValueId } of snapshot.conceptAttributes) {
    ownAttributes.set(
      conceptId,
      (ownAttributes.get(conceptId) ?? new Set()).add(attributeValueId)
    );
  }

  const concepts = new Map(
    snapshot.concepts.map((concept) => [concept.id, concept])
  );
  const applicableCache = new Map<string, Set<string>>();
  const empty: ReadonlySet<string> = new Set();

  const ontology: OntologyView = {
    concept: (id) => concepts.get(id),
    ancestors: (conceptId, types = FOOD_RELATIONSHIP_TYPES) =>
      walk(conceptId, up, types),
    descendants: (conceptId, types = FOOD_RELATIONSHIP_TYPES) =>
      walk(conceptId, down, types),
    applicableDefinitions(conceptId) {
      const cached = applicableCache.get(conceptId);
      if (cached) return cached;
      const result = new Set<string>();
      for (const id of [
        conceptId,
        ...walk(conceptId, up, HIERARCHICAL_RELATIONSHIP_TYPES),
      ]) {
        for (const definitionId of directApplicability.get(id) ?? [])
          result.add(definitionId);
      }
      applicableCache.set(conceptId, result);
      return result;
    },
    conceptAttributes: (conceptId) => ownAttributes.get(conceptId) ?? empty,
  };

  return {
    revision: snapshot.revision,
    lexicon,
    entries: lexicon.entries,
    attributeValues,
    preparations: new Map(
      snapshot.vocabulary.preparations.map((preparation) => [
        preparation.id,
        preparation,
      ])
    ),
    ontology,
    priorVerifiedShare: snapshot.priorVerifiedShare,
    config,
  };
}

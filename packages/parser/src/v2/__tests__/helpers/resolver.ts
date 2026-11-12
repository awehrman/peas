import { loadFixture } from "./golden.js";

import { createHash } from "node:crypto";

import type { LexiconRole } from "../../ast/types.js";
import type { FoodRelationshipType } from "../../ontology/types.js";
import {
  ATTRIBUTE_DIMENSIONS,
  PREPARATION_OPERATIONS,
} from "../../ontology/vocabulary.js";
import {
  type ResolverContext,
  type ResolverSnapshot,
  buildResolverContext,
} from "../../resolve/context.js";
import type { ResolutionCandidate } from "../../resolve/schemas.js";

/** A stable UUID (version 5 layout) for a fixture key, so test ids never change between runs. */
export function fixtureId(key: string): string {
  const hex = createHash("sha1").update(`peas-fixture:${key}`).digest("hex");
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(
    16
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

interface FixtureEntry {
  id: string;
  text: string;
  role: LexiconRole;
  kind?: "CANONICAL" | "PLURAL" | "ALIAS";
  concept?: string;
  attribute?: string;
  preparation?: string;
  valueKey?: string;
  status?: "ACTIVE" | "PROPOSED";
}

export interface FixtureOntology {
  concepts: string[];
  relationships: [string, FoodRelationshipType, string][];
  applicability: [string, string][];
  conceptAttributes: [string, string][];
}

interface SemanticFixture {
  revision: number;
  entries: FixtureEntry[];
  ontology: FixtureOntology;
}

/** Fixture vocabulary from the seeded vocabulary, with stable ids ("def:bone", "value:bone:boneless", "prep:chop"). */
export const fixtureVocabulary: ResolverSnapshot["vocabulary"] = {
  definitions: ATTRIBUTE_DIMENSIONS.map((dimension) => ({
    id: fixtureId(`def:${dimension.key}`),
    key: dimension.key,
    name: dimension.name,
    values: dimension.values.map((value) => ({
      id: fixtureId(`value:${dimension.key}:${value.key}`),
      key: value.key,
      label: value.label,
    })),
  })),
  preparations: PREPARATION_OPERATIONS.map((operation) => ({
    id: fixtureId(`prep:${operation.key}`),
    key: operation.key,
    label: operation.label,
  })),
};

/** "bone:boneless" -> attribute value id */
export function attributeId(key: string): string {
  const [definition, value] = key.split(":");
  return fixtureId(`value:${definition}:${value}`);
}

export function conceptId(key: string): string {
  return fixtureId(`concept:${key}`);
}

/**
 * Builds a resolver snapshot from fixture keys. Entries name their targets by key: `concept: "chicken-thigh"`, `attribute: "bone:boneless"`, `preparation: "chop"`, `valueKey: "fine"`.
 */
export function snapshotFromFixture(fixture: {
  revision: number;
  entries: FixtureEntry[];
  ontology: FixtureOntology;
}): ResolverSnapshot {
  return {
    revision: fixture.revision,
    entries: fixture.entries.map((entry) => ({
      id: entry.id,
      text: entry.text,
      role: entry.role,
      status: entry.status ?? "ACTIVE",
      kind: entry.kind ?? null,
      conceptId: entry.concept ? conceptId(entry.concept) : null,
      attributeValueId: entry.attribute ? attributeId(entry.attribute) : null,
      preparationId: entry.preparation
        ? fixtureId(`prep:${entry.preparation}`)
        : null,
      valueKey: entry.valueKey ?? null,
    })),
    vocabulary: fixtureVocabulary,
    concepts: fixture.ontology.concepts.map((key) => ({
      id: conceptId(key),
      canonicalName: key.replace(/-/g, " "),
      status: "VERIFIED" as const,
    })),
    relationships: fixture.ontology.relationships.map(
      ([source, type, target]) => ({
        sourceId: conceptId(source),
        targetId: conceptId(target),
        type,
      })
    ),
    applicability: fixture.ontology.applicability.map(
      ([definition, concept]) => ({
        definitionId: fixtureId(`def:${definition}`),
        conceptId: conceptId(concept),
      })
    ),
    conceptAttributes: fixture.ontology.conceptAttributes.map(
      ([concept, attribute]) => ({
        conceptId: conceptId(concept),
        attributeValueId: attributeId(attribute),
      })
    ),
    priorVerifiedShare: {},
  };
}

export function loadSemanticFixture(): SemanticFixture {
  return loadFixture<SemanticFixture>("lexicon/semantic-cases.json");
}

export function semanticContext(
  transform?: (fixture: SemanticFixture) => SemanticFixture
): ResolverContext {
  const fixture = loadSemanticFixture();
  return buildResolverContext(
    snapshotFromFixture(transform ? transform(fixture) : fixture)
  );
}

/** Readable view of a candidate for assertions: fixture keys instead of ids. */
export function describeCandidate(
  candidate: ResolutionCandidate | undefined,
  context: ResolverContext
) {
  if (!candidate) return null;
  const concept =
    context.ontology
      .concept(candidate.conceptId)
      ?.canonicalName.replace(/ /g, "-") ?? candidate.conceptId;
  return {
    concept,
    attributes: candidate.attributes
      .map((attribute) => {
        const value = context.attributeValues.get(attribute.attributeValueId);
        return value
          ? `${value.definitionKey}:${value.key}`
          : attribute.attributeValueId;
      })
      .sort(),
    preparations: candidate.preparations.map((preparation) => ({
      operation:
        context.preparations.get(preparation.preparationId)?.key ??
        preparation.preparationId,
      ...(preparation.degreeKey ? { degree: preparation.degreeKey } : {}),
      position: preparation.position,
    })),
    modifiers: candidate.modifiers.map(
      (modifier) => `${modifier.role}:${modifier.valueKey}`
    ),
    entryKind: candidate.entryId
      ? (context.entries.get(candidate.entryId)?.kind ?? null)
      : null,
  };
}

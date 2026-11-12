import { z } from "zod";

import { LEXICON_ROLES } from "../ast/types.js";
import {
  FOOD_RELATIONSHIP_TYPES,
  LEXICON_TERM_KINDS,
  PREP_POSITIONS,
} from "../ontology/types.js";

export const DISCOVERY_TYPES = [
  "UNKNOWN_FOOD_PHRASE",
  "UNKNOWN_MODIFIER",
  "ATTRIBUTE_INTERPRETATION",
  "IDENTITY_DECISION",
  "AMBIGUOUS_MATCH",
  "RELATIONSHIP_SUGGESTION",
  "STRUCTURAL_PATTERN",
  "VERIFIED_DRIFT",
] as const;
export type DiscoveryType = (typeof DISCOVERY_TYPES)[number];

export const DECISION_TYPES = [
  "MAP_TO_CONCEPT",
  "CREATE_CONCEPT",
  "CONCEPT_PLUS_ATTRIBUTE",
  "CLASSIFY_MODIFIER",
  "ADD_ATTRIBUTE_VALUE",
  "ADD_RELATIONSHIP",
  "MARK_AMBIGUOUS",
  "IGNORE_TOKEN",
  "REJECT",
  "MERGE_CONCEPTS",
  "CORRECT_MENTION",
  "REVERT",
] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

const phrase = z.string().trim().min(1);
const relationshipType = z.enum(FOOD_RELATIONSHIP_TYPES);

const modifierRoles = LEXICON_ROLES.filter((role) => role !== "FOOD") as [
  Exclude<(typeof LEXICON_ROLES)[number], "FOOD">,
  ...Exclude<(typeof LEXICON_ROLES)[number], "FOOD">[],
];

/** "boneless appears before chicken thigh in 41 notes" (adjacency mining). */
const adjacentHead = z.object({
  conceptId: z.uuid(),
  distinctNotes: z.number().int().nonnegative(),
});

/**
 * What the review queue found, stored as Discovery.payload. The `type` matches Discovery.type; `key` (the dedup key) lives on the row.
 *
 * @example UNKNOWN_FOOD_PHRASE      { type: "UNKNOWN_FOOD_PHRASE", phrase: "calamansi juice", headToken: "juice", suggestedHeadConceptIds: [<juice>] }
 * @example UNKNOWN_MODIFIER         { type: "UNKNOWN_MODIFIER", token: "spatchcocked", position: "PRE_HEAD", neighbors: ["chicken"], suggestedRoles: ["PREPARATION"], adjacentHeads: [{ conceptId: <chicken>, distinctNotes: 3 }] }
 * @example ATTRIBUTE_INTERPRETATION { type: "ATTRIBUTE_INTERPRETATION", phrase: "green", entryIds: [<color=green>, <ripeness=unripe>], headConceptId: <tomato> }
 * @example IDENTITY_DECISION        { type: "IDENTITY_DECISION", phrase: "smoked paprika", modifierEntryIds: [<smoked>], headConceptId: <paprika>, cooccurrence: 14 }
 * @example AMBIGUOUS_MATCH          { type: "AMBIGUOUS_MATCH", phrase: "cream", entryIds: [<heavy cream>, <sour cream>] }
 * @example RELATIONSHIP_SUGGESTION  { type: "RELATIONSHIP_SUGGESTION", sourceConceptId: <scallion>, targetConceptId: <onion>, relationshipType: "IS_A", evidence: "shares head token 'onion'" }
 * @example STRUCTURAL_PATTERN       { type: "STRUCTURAL_PATTERN", signature: "QTY UNIT PAREN(QTY UNIT) PHRASE", example: "1 cup (2 sticks) butter" }
 * @example VERIFIED_DRIFT           { type: "VERIFIED_DRIFT", mentionId: <m>, verifiedConceptId: <scallion>, proposedConceptId: <onion>, parserVersion: "2.0.0", lexiconRevision: 42 }
 */
export const DiscoveryPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("UNKNOWN_FOOD_PHRASE"),
    phrase,
    headToken: z.string().min(1).nullable(),
    /** Lexemes next to the phrase ("chopped" in "1 cup chopped calamansi"). */
    neighbors: z.array(z.string().min(1)).optional(),
    /** Concepts named by a word inside the phrase ("juice" in "calamansi juice"): DERIVED_FROM hints. */
    suggestedHeadConceptIds: z.array(z.uuid()).optional(),
  }),
  z.object({
    type: z.literal("UNKNOWN_MODIFIER"),
    token: phrase,
    position: z.enum([...PREP_POSITIONS, "MEASUREMENT"]),
    neighbors: z.array(z.string().min(1)),
    /** Roles suggested by position and spelling ("-ly" before a preparation suggests DEGREE). */
    suggestedRoles: z.array(z.enum(modifierRoles)).optional(),
    adjacentHeads: z.array(adjacentHead).optional(),
  }),
  z.object({
    type: z.literal("ATTRIBUTE_INTERPRETATION"),
    phrase,
    entryIds: z.array(z.uuid()).min(1),
    headConceptId: z.uuid().nullable(),
  }),
  z.object({
    type: z.literal("IDENTITY_DECISION"),
    phrase,
    modifierEntryIds: z.array(z.uuid()).min(1),
    headConceptId: z.uuid(),
    cooccurrence: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("AMBIGUOUS_MATCH"),
    phrase,
    entryIds: z.array(z.uuid()).min(2),
  }),
  z.object({
    type: z.literal("RELATIONSHIP_SUGGESTION"),
    sourceConceptId: z.uuid(),
    targetConceptId: z.uuid(),
    relationshipType,
    evidence: z.string().min(1),
  }),
  z.object({
    type: z.literal("STRUCTURAL_PATTERN"),
    signature: z.string().min(1),
    example: z.string().min(1),
  }),
  z.object({
    type: z.literal("VERIFIED_DRIFT"),
    mentionId: z.uuid(),
    verifiedConceptId: z.uuid().nullable(),
    proposedConceptId: z.uuid().nullable(),
    parserVersion: z.string().min(1),
    lexiconRevision: z.number().int().nonnegative(),
  }),
]);

/**
 * What a reviewer decided, stored as LexiconDecision.payload. Phase 4 applies the side effects; Phase 2 only validates and records.
 *
 * @example MAP_TO_CONCEPT         { type: "MAP_TO_CONCEPT", phrase: "spring onions", conceptId: <scallion>, kind: "REGIONAL" }
 * @example MAP_TO_CONCEPT         { type: "MAP_TO_CONCEPT", phrase: "pepper", conceptId: <black pepper>, kind: "ALIAS", exclusive: true } // "pepper" now only means black pepper
 * @example CREATE_CONCEPT         { type: "CREATE_CONCEPT", canonicalName: "smoked paprika", phrase: "smoked paprika", relationships: [{ targetConceptId: <paprika>, relationshipType: "IS_A" }] }
 * @example CONCEPT_PLUS_ATTRIBUTE { type: "CONCEPT_PLUS_ATTRIBUTE", phrase: "whole milk", modifierText: "whole", conceptId: <milk>, attributeValueIds: [<fat_content=whole>] }
 * @example CLASSIFY_MODIFIER      { type: "CLASSIFY_MODIFIER", token: "roughly", role: "DEGREE", valueKey: "rough" }
 * @example CLASSIFY_MODIFIER      { type: "CLASSIFY_MODIFIER", token: "fresh", role: "ATTRIBUTE", attributeValueId: <freshness=fresh>, applicableConceptIds: [<spinach>] }
 * @example ADD_ATTRIBUTE_VALUE    { type: "ADD_ATTRIBUTE_VALUE", definitionId: <color>, key: "purple", label: "Purple" }
 * @example ADD_RELATIONSHIP       { type: "ADD_RELATIONSHIP", sourceConceptId: <buttermilk>, targetConceptId: <milk>, relationshipType: "DERIVED_FROM" }
 * @example MARK_AMBIGUOUS         { type: "MARK_AMBIGUOUS", phrase: "cream", entryIds: [<heavy cream>, <sour cream>] }
 * @example IGNORE_TOKEN           { type: "IGNORE_TOKEN", token: "good-quality" }
 * @example REJECT                 { type: "REJECT", reason: "Not an ingredient (instruction text)" }
 * @example MERGE_CONCEPTS         { type: "MERGE_CONCEPTS", survivorId: <scallion>, mergedId: <green onion> }
 * @example CORRECT_MENTION        { type: "CORRECT_MENTION", mentionId: <m>, conceptId: <shallot>, attributeValueIds: [], teachPhrase: "echalote" }
 * @example REVERT                 { type: "REVERT", decisionId: <d> }
 */
export const DecisionPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MAP_TO_CONCEPT"),
    phrase,
    conceptId: z.uuid(),
    kind: z.enum(LEXICON_TERM_KINDS),
    /** Deprecate every other FOOD entry for the phrase, so it stops being ambiguous. */
    exclusive: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("CREATE_CONCEPT"),
    canonicalName: phrase,
    phrase,
    relationships: z.array(
      z.object({ targetConceptId: z.uuid(), relationshipType })
    ),
    /** Defaults to a generated English plural of `phrase`. */
    plural: phrase.optional(),
    /** Characterizing attributes stored on the concept (whole milk: fat_content=whole). */
    attributeValueIds: z.array(z.uuid()).optional(),
  }),
  z.object({
    type: z.literal("CONCEPT_PLUS_ATTRIBUTE"),
    phrase,
    /** The modifier word(s) to store as ATTRIBUTE entries ("whole"); existing entries are activated either way. */
    modifierText: phrase.optional(),
    conceptId: z.uuid(),
    attributeValueIds: z.array(z.uuid()).min(1),
  }),
  z
    .object({
      type: z.literal("CLASSIFY_MODIFIER"),
      token: phrase,
      role: z.enum(modifierRoles),
      attributeValueId: z.uuid().optional(),
      preparationId: z.uuid().optional(),
      valueKey: z.string().min(1).optional(),
      /** For ATTRIBUTE: concepts the value's dimension applies to (adds applicability rows). */
      applicableConceptIds: z.array(z.uuid()).optional(),
    })
    .refine(
      (payload) =>
        (payload.role === "ATTRIBUTE" &&
          payload.attributeValueId !== undefined) ||
        (payload.role === "PREPARATION" &&
          payload.preparationId !== undefined) ||
        (["DEGREE", "MEASUREMENT_MODIFIER", "INSTRUCTION"].includes(
          payload.role
        ) &&
          payload.valueKey !== undefined),
      {
        message:
          "The target must match the role (attributeValueId, preparationId, or valueKey)",
      }
    ),
  z.object({
    type: z.literal("ADD_ATTRIBUTE_VALUE"),
    definitionId: z.uuid(),
    key: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/, "Use a lowercase snake_case key"),
    label: phrase,
    applicableConceptIds: z.array(z.uuid()).optional(),
  }),
  z
    .object({
      type: z.literal("ADD_RELATIONSHIP"),
      sourceConceptId: z.uuid(),
      targetConceptId: z.uuid(),
      relationshipType,
    })
    .refine((payload) => payload.sourceConceptId !== payload.targetConceptId, {
      message: "A concept cannot relate to itself",
    }),
  z.object({
    type: z.literal("MARK_AMBIGUOUS"),
    phrase,
    entryIds: z.array(z.uuid()).min(2),
  }),
  z.object({ type: z.literal("IGNORE_TOKEN"), token: phrase }),
  z.object({ type: z.literal("REJECT"), reason: phrase }),
  z
    .object({
      type: z.literal("MERGE_CONCEPTS"),
      survivorId: z.uuid(),
      mergedId: z.uuid(),
    })
    .refine((payload) => payload.survivorId !== payload.mergedId, {
      message: "A concept cannot be merged into itself",
    }),
  z.object({
    type: z.literal("CORRECT_MENTION"),
    mentionId: z.uuid(),
    conceptId: z.uuid().nullable(),
    attributeValueIds: z.array(z.uuid()),
    /** Also teach the phrase as an ALIAS of `conceptId` ("teach from correction"). */
    teachPhrase: phrase.optional(),
  }),
  z.object({ type: z.literal("REVERT"), decisionId: z.uuid() }),
]);

const effectRow = z.object({
  table: z.string().min(1),
  id: z.uuid(),
  /** The row's status before the decision, so REVERT can restore it ("PROPOSED" for an entry the decision activated). */
  previous: z.string().min(1).optional(),
});

/**
 * Ids a decision created, changed, or retired, stored as LexiconDecision.effects so REVERT can undo exactly that.
 *
 * @example
 * { created: [{ table: "LexiconEntry", id: <e> }], updated: [{ table: "LexiconEntry", id: <e2>, previous: "PROPOSED" }], deprecated: [{ table: "FoodConcept", id: <green onion>, previous: "VERIFIED" }],
 *   applicabilityAdded: [{ definitionId: <bone>, conceptId: <chicken> }] }
 */
export const DecisionEffectsSchema = z.object({
  created: z.array(effectRow),
  updated: z.array(effectRow),
  deprecated: z.array(effectRow),
  /** Applicability rows have a composite key, so they are listed separately. */
  applicabilityAdded: z
    .array(z.object({ definitionId: z.uuid(), conceptId: z.uuid() }))
    .optional(),
});

export type DiscoveryPayload = z.infer<typeof DiscoveryPayloadSchema>;
export type DecisionPayload = z.infer<typeof DecisionPayloadSchema>;
export type DecisionEffects = z.infer<typeof DecisionEffectsSchema>;

export const EMPTY_DECISION_EFFECTS: DecisionEffects = {
  created: [],
  updated: [],
  deprecated: [],
};

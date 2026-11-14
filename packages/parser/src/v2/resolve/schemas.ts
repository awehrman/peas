import { z } from "zod";

import {
  IngredientSegmentSyntaxSchema,
  TextSpanSchema,
} from "../ast/schemas.js";
import { PARSE_STATUSES } from "../ast/types.js";
import {
  PREP_POSITIONS,
  RESOLUTION_STATUSES,
  VALUE_SOURCES,
} from "../ontology/types.js";

/**
 * The syntax snapshot stored on each mention (IngredientMention.syntax): the segment plus enough of its line to re-read it later.
 *
 * @example
 * // segment 1 of "1 tbsp butter and 2 tbsp olive oil"
 * {
 *   line: { raw: "1 tbsp butter and 2 tbsp olive oil", normalized: "1 tbsp butter and 2 tbsp olive oil", status: "PARSED", segmentationIndex: 0, segmentCount: 2 },
 *   segment: { index: 1, quantity: EXACT 2 tbsp, phrase: [FOOD "olive oil"], ... },
 * }
 */
export const MentionSyntaxSchema = z.object({
  line: z.object({
    raw: z.string(),
    normalized: z.string(),
    status: z.enum(PARSE_STATUSES),
    segmentationIndex: z.number().int().nonnegative(),
    segmentCount: z.number().int().positive(),
  }),
  segment: IngredientSegmentSyntaxSchema,
});

export type MentionSyntax = z.infer<typeof MentionSyntaxSchema>;

export const ResolutionStatusSchema = z.enum(RESOLUTION_STATUSES);

/**
 * An attribute the resolver attached to a mention.
 *
 * @example
 * // "boneless" in "1 lb boneless chicken thighs"
 * { attributeValueId: "<bone=boneless id>", lexiconEntryId: "<'boneless' entry id>", source: "ASSERTED", span: { start: 5, end: 13, text: "boneless" } }
 *
 * @example
 * // inferred, not written in the text
 * { attributeValueId: "<form=fresh id>", lexiconEntryId: null, source: "INFERRED", span: null }
 */
export const ResolvedAttributeSchema = z.object({
  attributeValueId: z.uuid(),
  lexiconEntryId: z.uuid().nullable(),
  source: z.enum(VALUE_SOURCES),
  span: TextSpanSchema.nullable(),
});

/**
 * A preparation step, in the order written.
 *
 * @example
 * // "garlic, finely minced"
 * { preparationId: "<mince id>", degreeKey: "fine", position: "POST_HEAD", span: { start: 8, end: 21, text: "finely minced" } }
 */
export const ResolvedPreparationSchema = z.object({
  preparationId: z.uuid(),
  degreeKey: z.string().min(1).nullable(),
  position: z.enum(PREP_POSITIONS),
  span: TextSpanSchema,
});

/**
 * A measurement modifier or instruction.
 *
 * @example
 * { role: "MEASUREMENT_MODIFIER", valueKey: "heaping", span: { start: 2, end: 9, text: "heaping" } }
 * { role: "INSTRUCTION", valueKey: "divided", span: { start: 30, end: 37, text: "divided" } }
 */
export const ResolvedModifierSchema = z.object({
  role: z.enum(["MEASUREMENT_MODIFIER", "INSTRUCTION"]),
  valueKey: z.string().min(1),
  span: TextSpanSchema,
});

/**
 * One interpretation of a segment: which concept it names, through which entry, and what else the text says about it.
 *
 * @example
 * // "1 lb boneless chicken thighs"
 * {
 *   conceptId: "<chicken thigh id>",
 *   entryId: "<'chicken thighs' PLURAL entry id>",
 *   score: 0.97,
 *   reasons: ["EXACT_ENTRY", "PLURAL"],
 *   attributes: [{ attributeValueId: "<bone=boneless id>", source: "ASSERTED", ... }],
 *   preparations: [],
 *   modifiers: [],
 *   unresolved: [],
 * }
 */
export const ResolutionCandidateSchema = z.object({
  conceptId: z.uuid(),
  entryId: z.uuid().nullable(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string().min(1)),
  attributes: z.array(ResolvedAttributeSchema),
  preparations: z.array(ResolvedPreparationSchema),
  modifiers: z.array(ResolvedModifierSchema),
  /** Phrase text this candidate leaves unexplained. */
  unresolved: z.array(TextSpanSchema),
});

/**
 * Everything the resolver concluded about one segment, stored as IngredientMention.resolution. Candidates are ranked best first; an empty list means nothing matched.
 *
 * @example
 * // "3 tablespoons calamansi juice" with no matching concept
 * { resolverVersion: "1.0.0", candidates: [], unresolved: [{ start: 14, end: 29, text: "calamansi juice" }] }
 */
export const ResolutionSchema = z.object({
  resolverVersion: z.string().min(1),
  candidates: z.array(ResolutionCandidateSchema),
  unresolved: z.array(TextSpanSchema),
});

export type ResolvedAttribute = z.infer<typeof ResolvedAttributeSchema>;
export type ResolvedPreparation = z.infer<typeof ResolvedPreparationSchema>;
export type ResolvedModifier = z.infer<typeof ResolvedModifierSchema>;
export type ResolutionCandidate = z.infer<typeof ResolutionCandidateSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;

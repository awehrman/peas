import { z } from "zod";

import {
  LEXICON_ROLES,
  PARSE_MODES,
  PARSE_STATUSES,
  type Quantity,
  UNIT_DIMENSIONS,
  UNSPECIFIED_EXPRESSIONS,
} from "./types.js";

/**
 * A slice of the raw input line, as half-open UTF-16 offsets.
 *
 * @example
 * // "2 cups flour" -> the unit "cups"
 * { start: 2, end: 6, text: "cups" }
 */
export const TextSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string(),
});

/**
 * An exact fraction, always reduced with a positive denominator.
 *
 * @example
 * // "1 ½" -> 3/2
 * { numerator: 3, denominator: 2 }
 */
export const RationalSchema = z.object({
  numerator: z.number().int(),
  denominator: z.number().int().positive(),
});

/**
 * A recognized unit: canonical id, dimension, and where it was written.
 *
 * @example
 * // "1 ½ tbsp. olive oil"
 * { id: "tbsp", dimension: "VOLUME", span: { start: 4, end: 9, text: "tbsp." } }
 */
export const UnitRefSchema = z.object({
  id: z.string().min(1),
  dimension: z.enum(UNIT_DIMENSIONS),
  span: TextSpanSchema,
});

/**
 * How much of an ingredient a segment asks for. Spans omitted below for brevity.
 *
 * @example
 * // EXACT        "2 cups"                -> { kind: "EXACT", value: 2/1, unit: cup }
 * // EXACT        "pinch of"              -> { kind: "EXACT", value: 1/1, unit: pinch, implied: true }
 * // RANGE        "2 to 3 lbs"            -> { kind: "RANGE", minimum: 2/1, maximum: 3/1, unit: lb }
 * // APPROXIMATE  "about 1 cup"           -> { kind: "APPROXIMATE", marker: "about", quantity: EXACT 1 cup }
 * // PACKAGE      "1 (14-ounce) can"      -> { kind: "PACKAGE", count: 1/1, packageType: can, packageSize: EXACT 14 oz }
 * // ALTERNATIVE  "1 tbsp or 15 ml"       -> { kind: "ALTERNATIVE", options: [EXACT 1 tbsp, EXACT 15 ml] }
 * // SUM          "1 cup plus 2 tbsp"     -> { kind: "SUM", parts: [EXACT 1 cup, EXACT 2 tbsp] }
 * // UNSPECIFIED  "to taste"              -> { kind: "UNSPECIFIED", expression: "TO_TASTE" }
 */
export const QuantitySchema: z.ZodType<Quantity> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("EXACT"),
      value: RationalSchema,
      unit: UnitRefSchema.optional(),
      implied: z.boolean().optional(),
      span: TextSpanSchema,
    }),
    z.object({
      kind: z.literal("RANGE"),
      minimum: RationalSchema,
      maximum: RationalSchema,
      unit: UnitRefSchema.optional(),
      span: TextSpanSchema,
    }),
    z.object({
      kind: z.literal("APPROXIMATE"),
      quantity: QuantitySchema,
      marker: TextSpanSchema,
      span: TextSpanSchema,
    }),
    z.object({
      kind: z.literal("PACKAGE"),
      count: RationalSchema,
      packageType: UnitRefSchema.optional(),
      packageSize: QuantitySchema.optional(),
      span: TextSpanSchema,
    }),
    z.object({
      kind: z.literal("ALTERNATIVE"),
      options: z.array(QuantitySchema),
      span: TextSpanSchema,
    }),
    z.object({
      kind: z.literal("SUM"),
      parts: z.array(QuantitySchema),
      span: TextSpanSchema,
    }),
    z.object({
      kind: z.literal("UNSPECIFIED"),
      expression: z.enum(UNSPECIFIED_EXPRESSIONS),
      span: TextSpanSchema,
    }),
  ])
);

/**
 * One word or punctuation mark in a phrase. LEXEME means the lexicon recognized it; UNKNOWN means it didn't (the grammar still keeps it).
 *
 * @example
 * // "3 large garlic cloves" with the demo lexicon
 * { kind: "LEXEME", span: { start: 2, end: 7, text: "large" }, entryIds: ["a41f6c2e-9d3b-4e8a-b7c5-1f0e2d9a6b38"], roles: ["ATTRIBUTE"] }
 * { kind: "LEXEME", span: { start: 8, end: 21, text: "garlic cloves" }, entryIds: ["5e3b9a10-2c4d-4f7e-8a6b-0d1c9e7f3a24"], roles: ["FOOD"] }
 *
 * @example
 * // "2 cups flour" with no lexicon
 * { kind: "UNKNOWN", span: { start: 7, end: 12, text: "flour" } }
 */
export const PhraseItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("LEXEME"),
    span: TextSpanSchema,
    entryIds: z.array(z.string()),
    roles: z.array(z.enum(LEXICON_ROLES)),
  }),
  z.object({ kind: z.literal("UNKNOWN"), span: TextSpanSchema }),
  z.object({ kind: z.literal("PUNCT"), span: TextSpanSchema }),
]);

/**
 * Text in parentheses that is not part of a package quantity, optionally with its own amount.
 *
 * @example
 * // "1 cup butter (2 sticks)"
 * { span: { text: "(2 sticks)", ... }, quantity: { kind: "EXACT", value: 2/1, unit: stick }, phrase: [] }
 */
export const ParentheticalSchema = z.object({
  span: TextSpanSchema,
  quantity: QuantitySchema.optional(),
  phrase: z.array(PhraseItemSchema),
});

/**
 * One ingredient mention within a line. Most lines have one segment; "1 tbsp butter and 2 tbsp olive oil" has two.
 *
 * @example
 * // "2 heaping cups all-purpose flour, sifted" with the demo lexicon
 * {
 *   index: 0,
 *   quantity: { kind: "EXACT", value: 2/1, unit: cup },        // "2 heaping cups"
 *   measurementModifiers: [LEXEME "heaping" MEASUREMENT_MODIFIER],
 *   phrase: [LEXEME "all-purpose flour" FOOD],
 *   parentheticals: [],
 *   trailing: { phrase: [LEXEME "sifted" PREPARATION] },        // everything after the comma
 * }
 *
 * @example
 * // "1 cup milk or cream": the grammar flags the conjunction; the resolver later decides whether it names two foods
 * { phrase: [UNKNOWN "milk", UNKNOWN "or", UNKNOWN "cream"], coordination: { conjunction: "or", confirmed: false } }
 */
export const IngredientSegmentSyntaxSchema = z.object({
  index: z.number().int().nonnegative(),
  span: TextSpanSchema,
  quantity: QuantitySchema.optional(),
  measurementModifiers: z.array(PhraseItemSchema),
  phrase: z.array(PhraseItemSchema),
  parentheticals: z.array(ParentheticalSchema),
  trailing: z
    .object({ span: TextSpanSchema, phrase: z.array(PhraseItemSchema) })
    .optional(),
  coordination: z
    .object({ conjunction: TextSpanSchema, confirmed: z.boolean() })
    .optional(),
});

/**
 * The full parse of one raw line. One of these is returned per lexicon segmentation (one in CONSERVATIVE mode).
 *
 * @example
 * // parseLineBest("1 ½ tbsp. extra-virgin olive oil, divided", { lexicon: demo })
 * {
 *   raw: "1 ½ tbsp. extra-virgin olive oil, divided",
 *   normalized: "1 1/2 tbsp. extra-virgin olive oil, divided",   // spans still point into `raw`
 *   status: "PARSED",                                            // PARTIAL when text is left over; FAILED when nothing parsed
 *   mode: "CONSERVATIVE",
 *   segmentationIndex: 0,
 *   parserVersion: "2.0.0",
 *   normalizerVersion: "1.0.0",
 *   lexiconRevision: 1,                                          // null when parsed without a lexicon
 *   segments: [{ quantity: EXACT 3/2 tbsp, phrase: [FOOD "extra-virgin olive oil"], trailing: [INSTRUCTION "divided"] }],
 *   unparsed: [],
 * }
 */
export const IngredientLineSyntaxSchema = z.object({
  raw: z.string(),
  normalized: z.string(),
  status: z.enum(PARSE_STATUSES),
  mode: z.enum(PARSE_MODES),
  segmentationIndex: z.number().int().nonnegative(),
  parserVersion: z.string(),
  normalizerVersion: z.string(),
  lexiconRevision: z.number().int().nullable(),
  segments: z.array(IngredientSegmentSyntaxSchema),
  unparsed: z.array(TextSpanSchema),
});

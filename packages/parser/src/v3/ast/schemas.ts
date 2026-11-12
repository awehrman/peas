import { z } from "zod";

import {
  LEXICON_ROLES,
  PARSE_MODES,
  PARSE_STATUSES,
  type Quantity,
  UNIT_DIMENSIONS,
  UNSPECIFIED_EXPRESSIONS,
} from "./types.js";

export const TextSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string(),
});

export const RationalSchema = z.object({
  numerator: z.number().int(),
  denominator: z.number().int().positive(),
});

export const UnitRefSchema = z.object({
  id: z.string().min(1),
  dimension: z.enum(UNIT_DIMENSIONS),
  span: TextSpanSchema,
});

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

export const ParentheticalSchema = z.object({
  span: TextSpanSchema,
  quantity: QuantitySchema.optional(),
  phrase: z.array(PhraseItemSchema),
});

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

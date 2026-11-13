import type {
  Coordination,
  IngredientLineSyntax,
  IngredientSegmentSyntax,
  Parenthetical,
  ParseMode,
  PhraseItem,
  Quantity,
  TextSpan,
  UnitRef,
} from "./ast/types.js";
import { parse as parseGrammar } from "./grammar/generated/parser.js";
import type {
  GrammarItem,
  GrammarQuantity,
  GrammarResult,
  GrammarSegment,
  GrammarSpan,
  GrammarUnit,
} from "./grammar/types.js";
import { DEFAULT_SEGMENTATION_LIMIT, segmentations } from "./lexicon/segment.js";
import type { Lexicon } from "./lexicon/token-trie.js";
import type { MatchesByStart } from "./lexicon/types.js";
import { type NormalizedText, normalizeText } from "./normalize/normalize-text.js";
import { type Token, tokenize } from "./normalize/tokenize.js";
import { createUnitMatcher } from "./quantity/units.js";
import { rational } from "./quantity/rational.js";
import { NORMALIZER_VERSION, PARSER_VERSION } from "./version.js";

export interface ParseLineOptions {
  lexicon?: Lexicon;
  mode?: ParseMode;
  /** Maximum segmentations returned in EXPLORATORY mode. */
  segmentationLimit?: number;
}

/**
 * Parses one raw ingredient line. Returns one syntax tree per lexicon
 * segmentation: exactly one in CONSERVATIVE mode, up to the limit in
 * EXPLORATORY mode. Never throws; a failed parse keeps the raw text.
 */
export function parseLine(raw: string, options: ParseLineOptions = {}): IngredientLineSyntax[] {
  const mode = options.mode ?? "CONSERVATIVE";
  const normalized = normalizeText(raw);
  const tokens = tokenize(normalized.text);

  const chosen: MatchesByStart[] = options.lexicon
    ? segmentations(
        options.lexicon.match(tokens, mode),
        tokens.length,
        mode,
        options.segmentationLimit ?? DEFAULT_SEGMENTATION_LIMIT
      )
    : [new Map()];

  return chosen.map((lexicon, segmentationIndex) =>
    parseSegmentation(normalized, tokens, lexicon, {
      mode,
      segmentationIndex,
      lexiconRevision: options.lexicon?.revision ?? null,
    })
  );
}

/** The preferred (first) syntax tree for a line. */
export function parseLineBest(raw: string, options: ParseLineOptions = {}): IngredientLineSyntax {
  const [best] = parseLine(raw, options);
  if (!best) throw new Error("parseLine returned no segmentations");
  return best;
}

interface SegmentationContext {
  mode: ParseMode;
  segmentationIndex: number;
  lexiconRevision: number | null;
}

function parseSegmentation(
  normalized: NormalizedText,
  tokens: Token[],
  lexicon: MatchesByStart,
  context: SegmentationContext
): IngredientLineSyntax {
  const base = {
    raw: normalized.raw,
    normalized: normalized.text,
    mode: context.mode,
    segmentationIndex: context.segmentationIndex,
    parserVersion: PARSER_VERSION,
    normalizerVersion: NORMALIZER_VERSION,
    lexiconRevision: context.lexiconRevision,
  };

  let result: GrammarResult;
  try {
    result = parseGrammar(normalized.text, {
      units: createUnitMatcher(normalized.text),
      lexicon,
      tokens: new Map(tokens.map((token) => [token.start, token])),
    }) as GrammarResult;
  } catch {
    return {
      ...base,
      status: "FAILED",
      segments: [],
      unparsed: normalized.raw.length
        ? [{ start: 0, end: normalized.raw.length, text: normalized.raw }]
        : [],
    };
  }

  const toSpan = (span: GrammarSpan): TextSpan => normalized.toRawSpan(span.start, span.end);
  const segments = result.segments.map((segment, index) => toSegment(segment, index, toSpan));
  const unparsed = result.unparsed.map(toSpan);

  return {
    ...base,
    status: lineStatus(segments, unparsed),
    segments,
    unparsed,
  };
}

function lineStatus(
  segments: IngredientSegmentSyntax[],
  unparsed: TextSpan[]
): IngredientLineSyntax["status"] {
  if (segments.length === 0) return "FAILED";
  const hasEmptySegment = segments.some(
    (segment) => !segment.quantity && segment.phrase.length === 0
  );
  return unparsed.length > 0 || hasEmptySegment ? "PARTIAL" : "PARSED";
}

type ToSpan = (span: GrammarSpan) => TextSpan;

function toUnit(unit: GrammarUnit, toSpan: ToSpan): UnitRef {
  return { id: unit.id, dimension: unit.dimension, span: toSpan(unit) };
}

function toQuantity(quantity: GrammarQuantity, toSpan: ToSpan): Quantity {
  const span = toSpan(quantity);
  switch (quantity.kind) {
    case "EXACT":
      return {
        kind: "EXACT",
        value: rational(quantity.value.numerator, quantity.value.denominator),
        ...(quantity.unit ? { unit: toUnit(quantity.unit, toSpan) } : {}),
        ...(quantity.implied ? { implied: true } : {}),
        span,
      };
    case "RANGE":
      return {
        kind: "RANGE",
        minimum: rational(quantity.minimum.numerator, quantity.minimum.denominator),
        maximum: rational(quantity.maximum.numerator, quantity.maximum.denominator),
        ...(quantity.unit ? { unit: toUnit(quantity.unit, toSpan) } : {}),
        span,
      };
    case "MEASURE_RANGE":
      return {
        kind: "MEASURE_RANGE",
        from: toQuantity(quantity.from, toSpan),
        to: toQuantity(quantity.to, toSpan),
        span,
      };
    case "APPROXIMATE":
      return {
        kind: "APPROXIMATE",
        quantity: toQuantity(quantity.quantity, toSpan),
        marker: toSpan(quantity.marker),
        span,
      };
    case "PACKAGE":
      return {
        kind: "PACKAGE",
        count: rational(quantity.count.numerator, quantity.count.denominator),
        ...(quantity.packageType ? { packageType: toUnit(quantity.packageType, toSpan) } : {}),
        ...(quantity.packageSize
          ? { packageSize: toQuantity(quantity.packageSize, toSpan) }
          : {}),
        span,
      };
    case "ALTERNATIVE":
      return {
        kind: "ALTERNATIVE",
        options: quantity.options.map((option) => toQuantity(option, toSpan)),
        span,
      };
    case "SUM":
      return {
        kind: "SUM",
        parts: quantity.parts.map((part) => toQuantity(part, toSpan)),
        span,
      };
    case "UNSPECIFIED":
      return {
        kind: "UNSPECIFIED",
        expression: quantity.expression,
        ...(quantity.unit ? { unit: toUnit(quantity.unit, toSpan) } : {}),
        span,
      };
  }
}

/** Collects what grammar items imply for the segment as a whole. */
interface SegmentAccumulator {
  quantity?: Quantity;
  parentheticals: Parenthetical[];
  coordination?: Coordination;
}

function toPhraseItems(
  items: GrammarItem[],
  toSpan: ToSpan,
  accumulator: SegmentAccumulator
): PhraseItem[] {
  const phrase: PhraseItem[] = [];

  for (const item of items) {
    const span = toSpan(item);
    // One raw character can normalize to several tokens ("⅓" -> "1/3")
    const previous = phrase[phrase.length - 1];
    if (previous && previous.span.start === span.start && previous.span.end === span.end) {
      continue;
    }
    switch (item.kind) {
      case "LEXEME":
        phrase.push({ kind: "LEXEME", span, entryIds: item.entryIds, roles: item.roles });
        break;
      case "UNKNOWN":
        phrase.push({ kind: "UNKNOWN", span });
        break;
      case "PUNCT":
        phrase.push({ kind: "PUNCT", span });
        break;
      case "CONJ":
        accumulator.coordination ??= { conjunction: span, confirmed: false };
        phrase.push({ kind: "UNKNOWN", span });
        break;
      case "MARKER":
        if (accumulator.quantity) {
          phrase.push({ kind: "UNKNOWN", span });
        } else {
          accumulator.quantity = { kind: "UNSPECIFIED", expression: item.expression, span };
        }
        break;
      case "PAREN": {
        const inner = toPhraseItems(item.items, toSpan, accumulator);
        accumulator.parentheticals.push({
          span,
          ...(item.quantity ? { quantity: toQuantity(item.quantity, toSpan) } : {}),
          phrase: inner,
        });
        break;
      }
    }
  }

  return phrase;
}

function toSegment(segment: GrammarSegment, index: number, toSpan: ToSpan): IngredientSegmentSyntax {
  const accumulator: SegmentAccumulator = {
    ...(segment.quantity ? { quantity: toQuantity(segment.quantity, toSpan) } : {}),
    parentheticals: [],
  };

  const measurementModifiers = toPhraseItems(segment.modifiers, toSpan, accumulator);
  const phrase = toPhraseItems(segment.items, toSpan, accumulator);
  const trailing = segment.trailing
    ? {
        span: toSpan(segment.trailing),
        phrase: toPhraseItems(segment.trailing.items, toSpan, accumulator),
      }
    : undefined;

  return {
    index,
    span: toSpan(segment),
    ...(accumulator.quantity ? { quantity: accumulator.quantity } : {}),
    measurementModifiers,
    phrase,
    parentheticals: accumulator.parentheticals,
    ...(trailing ? { trailing } : {}),
    ...(accumulator.coordination ? { coordination: accumulator.coordination } : {}),
  };
}

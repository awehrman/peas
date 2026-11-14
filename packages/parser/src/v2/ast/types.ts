/** UTF-16 code-unit offsets into the raw input, half-open `[start, end)`. */
export interface TextSpan {
  start: number;
  end: number;
  text: string;
}

/** Exact fraction; denominator is always positive and the pair is reduced. */
export interface Rational {
  numerator: number;
  denominator: number;
}

export const UNIT_DIMENSIONS = [
  "MASS",
  "VOLUME",
  "COUNT",
  "LENGTH",
  "PACKAGE",
] as const;
export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];

export interface UnitRef {
  id: string;
  dimension: UnitDimension;
  span: TextSpan;
}

export const UNSPECIFIED_EXPRESSIONS = [
  "TO_TASTE",
  "AS_NEEDED",
  "SOME",
  "FEW",
  "SEVERAL",
] as const;
export type UnspecifiedExpression = (typeof UNSPECIFIED_EXPRESSIONS)[number];

export interface ExactQuantity {
  kind: "EXACT";
  value: Rational;
  unit?: UnitRef;
  /** The amount is implied rather than written ("pinch of salt"). */
  implied?: boolean;
  span: TextSpan;
}

export interface RangeQuantity {
  kind: "RANGE";
  minimum: Rational;
  maximum: Rational;
  unit?: UnitRef;
  span: TextSpan;
}

export interface ApproximateQuantity {
  kind: "APPROXIMATE";
  quantity: Quantity;
  marker: TextSpan;
  span: TextSpan;
}

export interface PackageQuantity {
  kind: "PACKAGE";
  count: Rational;
  packageType?: UnitRef;
  packageSize?: Quantity;
  span: TextSpan;
}

export interface AlternativeQuantity {
  kind: "ALTERNATIVE";
  options: Quantity[];
  span: TextSpan;
}

export interface SumQuantity {
  kind: "SUM";
  parts: Quantity[];
  span: TextSpan;
}

export interface UnspecifiedQuantity {
  kind: "UNSPECIFIED";
  expression: UnspecifiedExpression;
  /** The unit an unspecified amount counts in ("a few sprigs"). */
  unit?: UnitRef;
  span: TextSpan;
}

/** A range whose ends are separate measures ("800g–1kg", "1lb 12oz–2lb 4oz"); ends sharing one unit are a RANGE instead. */
export interface MeasureRangeQuantity {
  kind: "MEASURE_RANGE";
  from: Quantity;
  to: Quantity;
  span: TextSpan;
}

export type Quantity =
  | ExactQuantity
  | RangeQuantity
  | MeasureRangeQuantity
  | ApproximateQuantity
  | PackageQuantity
  | AlternativeQuantity
  | SumQuantity
  | UnspecifiedQuantity;

export const LEXICON_ROLES = [
  "FOOD",
  "ATTRIBUTE",
  "PREPARATION",
  "DEGREE",
  "MEASUREMENT_MODIFIER",
  "INSTRUCTION",
] as const;
export type LexiconRole = (typeof LEXICON_ROLES)[number];

export interface LexemeItem {
  kind: "LEXEME";
  span: TextSpan;
  entryIds: string[];
  roles: LexiconRole[];
}

export interface UnknownItem {
  kind: "UNKNOWN";
  span: TextSpan;
}

export interface PunctItem {
  kind: "PUNCT";
  span: TextSpan;
}

export type PhraseItem = LexemeItem | UnknownItem | PunctItem;

export interface Parenthetical {
  span: TextSpan;
  quantity?: Quantity;
  phrase: PhraseItem[];
}

export interface Coordination {
  conjunction: TextSpan;
  /** Set by the resolver once it decides whether the line names two foods. */
  confirmed: boolean;
}

export interface IngredientSegmentSyntax {
  index: number;
  span: TextSpan;
  quantity?: Quantity;
  /** Lexemes between the amount and the unit ("1 heaping cup"). */
  measurementModifiers: PhraseItem[];
  phrase: PhraseItem[];
  parentheticals: Parenthetical[];
  trailing?: { span: TextSpan; phrase: PhraseItem[] };
  coordination?: Coordination;
}

export const PARSE_STATUSES = ["PARSED", "PARTIAL", "FAILED"] as const;
export type ParseStatus = (typeof PARSE_STATUSES)[number];

export const PARSE_MODES = ["CONSERVATIVE", "EXPLORATORY"] as const;
export type ParseMode = (typeof PARSE_MODES)[number];

export interface IngredientLineSyntax {
  raw: string;
  normalized: string;
  status: ParseStatus;
  mode: ParseMode;
  segmentationIndex: number;
  parserVersion: string;
  normalizerVersion: string;
  lexiconRevision: number | null;
  segments: IngredientSegmentSyntax[];
  unparsed: TextSpan[];
}

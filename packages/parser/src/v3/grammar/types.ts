import type {
  LexiconRole,
  Rational,
  UnitDimension,
  UnspecifiedExpression,
} from "../ast/types.js";

/** Normalized-text offsets as returned by the generated grammar. */
export interface GrammarSpan {
  start: number;
  end: number;
}

export interface GrammarUnit extends GrammarSpan {
  id: string;
  dimension: UnitDimension;
}

export type GrammarQuantity = GrammarSpan &
  (
    | { kind: "EXACT"; value: Rational; unit: GrammarUnit | null; implied?: boolean }
    | { kind: "RANGE"; minimum: Rational; maximum: Rational; unit: GrammarUnit | null }
    | { kind: "APPROXIMATE"; quantity: GrammarQuantity; marker: GrammarSpan }
    | {
        kind: "PACKAGE";
        count: Rational;
        packageType?: GrammarUnit;
        packageSize?: GrammarQuantity;
      }
    | { kind: "ALTERNATIVE"; options: GrammarQuantity[] }
    | { kind: "SUM"; parts: GrammarQuantity[] }
    | { kind: "UNSPECIFIED"; expression: UnspecifiedExpression }
  );

export type GrammarItem = GrammarSpan &
  (
    | { kind: "LEXEME"; entryIds: string[]; roles: LexiconRole[] }
    | { kind: "UNKNOWN" }
    | { kind: "PUNCT" }
    | { kind: "CONJ" }
    | { kind: "MARKER"; expression: UnspecifiedExpression }
    | { kind: "PAREN"; quantity: GrammarQuantity | null; items: GrammarItem[] }
  );

export interface GrammarSegment extends GrammarSpan {
  quantity: GrammarQuantity | null;
  modifiers: GrammarItem[];
  items: GrammarItem[];
  trailing: (GrammarSpan & { items: GrammarItem[] }) | null;
}

export interface GrammarResult {
  segments: GrammarSegment[];
  unparsed: GrammarSpan[];
}

import type {
  IngredientLineSyntax,
  PhraseItem,
  TextSpan,
} from "../ast/types.js";
import { createUnitMatcher } from "../quantity/units.js";

const MAX_SYMBOLS = 14;
const TOKEN = /\p{Nd}+(?:[.,]\p{Nd}+)?|\p{No}|[\p{L}'’]+|[^\s\p{L}\p{N}]/gu;
const DASHES = /^[-‐‑‒–—]$/u;
const KEPT_PUNCTUATION = new Set(["(", ")", "-", "/", ",", ":"]);
const STRUCTURAL_ROLES = new Set(["MEASUREMENT_MODIFIER", "DEGREE"]);

/** Why a line looks like a structure the grammar does not handle yet. */
export const STRUCTURAL_REASONS = [
  "UNPARSED",
  "QUANTITY_IN_PHRASE",
  "HEADING",
] as const;
export type StructuralReason = (typeof STRUCTURAL_REASONS)[number];

export interface StructuralIssue {
  reason: StructuralReason;
  signature: string;
  segmentIndex: number;
  /** The text that gave it away: unparsed text, the stray number or unit, or the whole heading. */
  span: TextSpan;
}

function lexemeSpans(syntax: IngredientLineSyntax): PhraseItem[] {
  return syntax.segments.flatMap((segment) => [
    ...segment.measurementModifiers,
    ...segment.phrase,
    ...segment.parentheticals.flatMap((parenthetical) => parenthetical.phrase),
    ...(segment.trailing?.phrase ?? []),
  ]);
}

/**
 * A line's shape as token classes, so lines with the same unsupported structure group into one discovery. Words collapse into `W` whatever the lexicon knows (signatures stay put as Peas learns foods); `N` is a number, `F` a fraction or mixed number, `U` a known unit, `L` a measurement modifier or degree ("heaping", "finely"), `x` a dimension separator, and `(`, `)`, `-`, `/`, `,`, `:` stay as they are. The signature stops at the first comma after a word, since trailing text ("chopped") is rarely structural, and at 14 symbols.
 *
 * @example
 * structureSignature(parseLineBest("small handful coriander, chopped"))         // "W U W"
 * structureSignature(parseLineBest("Small handful of whole black peppercorns")) // "W U W"
 * structureSignature(parseLineBest("11-x-17-inch baking sheet"))                // "N - x - N - U W"
 * structureSignature(parseLineBest("1 1/2 cups flour"))                         // "F U W"
 */
export function structureSignature(syntax: IngredientLineSyntax): string {
  const raw = syntax.raw;
  const units = createUnitMatcher(raw);
  const structuralLexemes = lexemeSpans(syntax).filter(
    (item) =>
      item.kind === "LEXEME" &&
      item.roles.some((role) => STRUCTURAL_ROLES.has(role))
  );
  const isStructuralLexeme = (start: number) =>
    structuralLexemes.some(
      (item) => item.span.start <= start && start < item.span.end
    );

  const symbols: string[] = [];
  let unitEnd = -1;
  let sawWord = false;
  for (const match of raw.matchAll(TOKEN)) {
    const text = match[0];
    const start = match.index ?? 0;
    if (start < unitEnd) continue;

    let symbol: string | null;
    if (/^\p{Nd}/u.test(text)) symbol = "N";
    else if (/^\p{No}$/u.test(text)) symbol = "F";
    else if (/^\p{L}/u.test(text)) {
      const unit = units.matchAt(start);
      if (unit && unit.length >= text.length) {
        symbol = "U";
        unitEnd = start + unit.length;
      } else if (text.toLowerCase() === "x") symbol = "x";
      else if (isStructuralLexeme(start)) symbol = "L";
      else symbol = "W";
    } else if (DASHES.test(text)) symbol = "-";
    else symbol = KEPT_PUNCTUATION.has(text) ? text : null;
    if (symbol === null) continue;

    if (symbol === "," && sawWord) break;
    if (symbol === "W") sawWord = true;
    symbols.push(symbol);
  }

  const collapsed: string[] = [];
  for (const symbol of symbols) {
    const previous = collapsed[collapsed.length - 1];
    if (symbol === "W" && previous === "W") continue;
    if (symbol === "N" && previous === "/" && collapsed.at(-2) === "N") {
      collapsed.splice(-2, 2, "F");
      if (collapsed.at(-2) === "N") collapsed.splice(-2, 1);
      continue;
    }
    if (symbol === "F" && previous === "N") {
      collapsed[collapsed.length - 1] = "F";
      continue;
    }
    collapsed.push(symbol);
  }
  return collapsed.slice(0, MAX_SYMBOLS).join(" ");
}

const QUANTITY_WORDS = new Set(["a", "an", "few", "some", "several"]);

/**
 * A unit word in the phrase is a stranded measure when it follows a quantity word ("a few sprigs" left in the phrase) or more of the phrase follows it ("small handful coriander"). A unit word ending a food name ("baby back ribs") or hyphen-joined to a word ("bone-in") is part of the name. Numbers before it are reported on their own.
 */
function isStrayUnit(items: PhraseItem[], index: number, raw: string): boolean {
  const start = items[index]?.span.start ?? 0;
  if (/\p{L}-$/u.test(raw.slice(0, start))) return false;
  const previous = items[index - 1]?.span.text.toLowerCase() ?? "";
  return QUANTITY_WORDS.has(previous) || index < items.length - 1;
}

function strayQuantity(syntax: IngredientLineSyntax): {
  segmentIndex: number;
  span: TextSpan;
} | null {
  const units = createUnitMatcher(syntax.raw);
  for (const segment of syntax.segments) {
    const items = [
      ...segment.phrase,
      ...segment.parentheticals
        .filter((parenthetical) => !parenthetical.quantity)
        .flatMap((parenthetical) => parenthetical.phrase),
    ];
    for (const [index, item] of items.entries()) {
      if (item.kind !== "UNKNOWN") continue;
      const isNumber = /^\p{N}/u.test(item.span.text);
      const unit = units.matchAt(item.span.start);
      const isUnit =
        unit !== null &&
        unit.length >= item.span.text.length &&
        isStrayUnit(items, index, syntax.raw);
      if (isNumber || isUnit)
        return { segmentIndex: segment.index, span: item.span };
    }
  }
  return null;
}

/**
 * Whether a parsed line shows a structure the grammar does not handle yet, and why: text left unparsed (or a PARTIAL / FAILED parse), a number or unit stranded in the food phrase ("small handful coriander": the size word kept "handful" from being read as the amount), or a heading with no quantity that ends in a colon ("For the sauce:"). Returns null for lines that parsed cleanly.
 *
 * @example
 * structuralIssue(parseLineBest("small handful coriander, chopped"))
 * // { reason: "QUANTITY_IN_PHRASE", signature: "W U W", segmentIndex: 0, span: { text: "handful", ... } }
 * structuralIssue(parseLineBest("2 cups flour")) // null
 */
export function structuralIssue(
  syntax: IngredientLineSyntax
): StructuralIssue | null {
  const signature = structureSignature(syntax);
  const whole: TextSpan = { start: 0, end: syntax.raw.length, text: syntax.raw };

  const firstUnparsed = syntax.unparsed[0];
  if (syntax.status !== "PARSED" || firstUnparsed)
    return {
      reason: "UNPARSED",
      signature,
      segmentIndex: 0,
      span: firstUnparsed ?? whole,
    };

  const stray = strayQuantity(syntax);
  if (stray) return { reason: "QUANTITY_IN_PHRASE", signature, ...stray };

  const [only] = syntax.segments;
  if (
    syntax.segments.length === 1 &&
    only &&
    !only.quantity &&
    syntax.raw.trim().endsWith(":")
  )
    return { reason: "HEADING", signature, segmentIndex: 0, span: whole };

  return null;
}

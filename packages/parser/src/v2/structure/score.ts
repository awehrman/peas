import type { BlockFeatures } from "./features.js";
import {
  type BlockKind,
  type BlockScores,
  type BlockSignal,
  SCORED_BLOCK_KINDS,
  type ScoredBlockKind,
  type SignalId,
} from "./types.js";

/**
 * Points per signal. Positive weights count toward the kind, negative ones against it. Changing any value means bumping STRUCTURE_CLASSIFIER_VERSION and rerunning `yarn evaluate:structure`.
 */
export const SIGNAL_WEIGHTS: Record<
  SignalId,
  { kind: ScoredBlockKind; weight: number }
> = {
  IMPORTER_SECTION: { kind: "INGREDIENT", weight: 1 },
  LEADING_QUANTITY: { kind: "INGREDIENT", weight: 3 },
  UNIT: { kind: "INGREDIENT", weight: 1 },
  UNSPECIFIED_AMOUNT: { kind: "INGREDIENT", weight: 2 },
  INGREDIENT_NOTE: { kind: "INGREDIENT", weight: 1.5 },
  KNOWN_FOOD: { kind: "INGREDIENT", weight: 1.5 },
  SHORT_PHRASE: { kind: "INGREDIENT", weight: 1 },
  VERB_NOT_INGREDIENT: { kind: "INGREDIENT", weight: -1.5 },
  COOKING_VERB: { kind: "INSTRUCTION", weight: 3 },
  STEP_OPENER: { kind: "INSTRUCTION", weight: 2.5 },
  NUMBERED_STEP: { kind: "INSTRUCTION", weight: 1.5 },
  TEMPERATURE: { kind: "INSTRUCTION", weight: 2 },
  DURATION: { kind: "INSTRUCTION", weight: 1 },
  UNTIL: { kind: "INSTRUCTION", weight: 1 },
  SEVERAL_SENTENCES: { kind: "INSTRUCTION", weight: 2 },
  SENTENCE: { kind: "INSTRUCTION", weight: 1 },
  LONG: { kind: "INSTRUCTION", weight: 1.5 },
  QUANTITY_NOT_STEP: { kind: "INSTRUCTION", weight: -1.5 },
  NEXT_TO_INSTRUCTIONS: { kind: "INSTRUCTION", weight: 1 },
  COLON_HEADING: { kind: "SECTION_HEADING", weight: 4 },
  FOR_THE: { kind: "SECTION_HEADING", weight: 3.5 },
  HEADING_WORD: { kind: "SECTION_HEADING", weight: 3.5 },
  ALL_CAPS: { kind: "SECTION_HEADING", weight: 2 },
  SENTENCE_NOT_HEADING: { kind: "SECTION_HEADING", weight: -2 },
  FOLLOWED_BY_INGREDIENTS: { kind: "SECTION_HEADING", weight: 1.5 },
  BETWEEN_INGREDIENTS: { kind: "SECTION_HEADING", weight: 1 },
  NOTE_MARKER: { kind: "NOTE", weight: 4 },
  PARENTHESIZED: { kind: "NOTE", weight: 2.5 },
  YIELD: { kind: "OTHER", weight: 4 },
  URL: { kind: "OTHER", weight: 4 },
};

/** Below this, no kind is confident enough and the block is UNKNOWN. */
export const MIN_KIND_SCORE = 2;

/**
 * The signal with its configured kind and weight. IMPORTER_SECTION takes the kind it is given (the importer's section).
 *
 * @example
 * signal("COOKING_VERB", "preheat") // { id: "COOKING_VERB", kind: "INSTRUCTION", weight: 3, text: "preheat" }
 */
export function signal(
  id: SignalId,
  text?: string,
  kind?: ScoredBlockKind
): BlockSignal {
  const config = SIGNAL_WEIGHTS[id];
  return {
    id,
    kind: kind ?? config.kind,
    weight: config.weight,
    ...(text ? { text } : {}),
  };
}

/**
 * The signals a line carries on its own, before its neighbors or the importer's choice are considered. A quantity and unit are never proof of an ingredient on their own: "Cook for 20 minutes" has both and still scores as a step.
 *
 * @example
 * featureSignals(blockFeatures("Salt and pepper to taste")).map((s) => s.id)
 * // ["UNSPECIFIED_AMOUNT", "INGREDIENT_NOTE", "SHORT_PHRASE"]
 */
export function featureSignals(features: BlockFeatures): BlockSignal[] {
  const signals: BlockSignal[] = [];
  const add = (id: SignalId, text?: string) => signals.push(signal(id, text));
  const hasQuantity = features.leadingQuantity !== null;
  const isStep =
    features.leadingVerb !== null || features.leadingOpener !== null;

  if (hasQuantity)
    add("LEADING_QUANTITY", features.leadingQuantity ?? undefined);
  if (hasQuantity && features.hasUnit) add("UNIT");
  if (features.unspecifiedAmount) add("UNSPECIFIED_AMOUNT");
  if (features.ingredientNote) add("INGREDIENT_NOTE", features.ingredientNote);
  if (features.foodLexemeCount > 0 && !isStep) add("KNOWN_FOOD");
  const headingEvidence =
    features.headingWord !== null ||
    features.forTheHeading ||
    (features.endsWithColon && !hasQuantity);
  if (
    features.wordCount <= 8 &&
    features.sentenceCount <= 1 &&
    !features.endsWithPeriod &&
    !headingEvidence
  )
    add("SHORT_PHRASE");
  if (features.leadingVerb) add("VERB_NOT_INGREDIENT");

  if (features.leadingVerb) add("COOKING_VERB", features.leadingVerb);
  if (features.leadingOpener) add("STEP_OPENER", features.leadingOpener);
  if (features.numberedStep) add("NUMBERED_STEP");
  if (features.temperature) add("TEMPERATURE", features.temperature);
  if (features.duration) add("DURATION", features.duration);
  if (features.hasUntil) add("UNTIL");
  if (features.sentenceCount >= 2) add("SEVERAL_SENTENCES");
  if (features.endsWithPeriod && features.wordCount >= 6) add("SENTENCE");
  if (features.wordCount > 20) add("LONG");
  if (hasQuantity) add("QUANTITY_NOT_STEP");

  const headingSized = !hasQuantity && features.wordCount <= 6;
  if (features.endsWithColon && headingSized && !features.noteMarker)
    add("COLON_HEADING");
  if (features.forTheHeading && headingSized && !features.leadingVerb)
    add("FOR_THE");
  if (features.headingWord && !hasQuantity)
    add("HEADING_WORD", features.headingWord);
  if (features.allCaps && features.wordCount <= 5 && !hasQuantity)
    add("ALL_CAPS");
  if (features.endsWithPeriod && features.wordCount >= 4)
    add("SENTENCE_NOT_HEADING");

  if (features.noteMarker) add("NOTE_MARKER", features.noteMarker);
  if (features.parenthesized) add("PARENTHESIZED");
  if (features.yieldOrSource) add("YIELD", features.yieldOrSource);
  if (features.url) add("URL");
  return signals;
}

/**
 * Sums signals per kind.
 *
 * @example
 * totalScores([signal("COOKING_VERB"), signal("TEMPERATURE")]).INSTRUCTION // 5
 */
export function totalScores(signals: readonly BlockSignal[]): BlockScores {
  const scores = Object.fromEntries(
    SCORED_BLOCK_KINDS.map((kind) => [kind, 0])
  ) as BlockScores;
  for (const item of signals) scores[item.kind] += item.weight;
  return scores;
}

/**
 * The winning kind, or UNKNOWN when nothing reaches MIN_KIND_SCORE. Ties go to the earlier kind in SCORED_BLOCK_KINDS (ingredient, then instruction), so the result never depends on signal order.
 *
 * @example
 * bestKind({ INGREDIENT: 1, INSTRUCTION: 5, SECTION_HEADING: 0, NOTE: 0, OTHER: 0 }) // "INSTRUCTION"
 * bestKind({ INGREDIENT: 1, INSTRUCTION: 1, SECTION_HEADING: 0, NOTE: 0, OTHER: 0 }) // "UNKNOWN"
 */
export function bestKind(scores: BlockScores): BlockKind {
  let best: ScoredBlockKind = SCORED_BLOCK_KINDS[0];
  for (const kind of SCORED_BLOCK_KINDS) {
    if (scores[kind] > scores[best]) best = kind;
  }
  return scores[best] >= MIN_KIND_SCORE ? best : "UNKNOWN";
}

/**
 * How far the leader is ahead of the runner-up.
 *
 * @example
 * leadOf({ INGREDIENT: 6, INSTRUCTION: 1, SECTION_HEADING: 0, NOTE: 0, OTHER: 0 }) // 5
 */
export function leadOf(scores: BlockScores): number {
  const sorted = SCORED_BLOCK_KINDS.map((kind) => scores[kind]).sort(
    (a, b) => b - a
  );
  return (sorted[0] ?? 0) - (sorted[1] ?? 0);
}

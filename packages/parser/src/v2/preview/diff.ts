import type { IngredientLineSyntax, TextSpan } from "../ast/types.js";
import { describeSyntax } from "../debug/describe.js";
import type { ResolverContext } from "../resolve/context.js";
import type {
  MentionStatus,
  SegmentResolution,
} from "../resolve/resolve-segment.js";

export interface SyntaxDiff {
  changed: boolean;
  before: string;
  after: string;
}

/** Compares two parses of the same line by their readable summaries. */
export function diffSyntax(
  before: IngredientLineSyntax,
  after: IngredientLineSyntax
): SyntaxDiff {
  const beforeText = describeSyntax(before);
  const afterText = describeSyntax(after);
  return {
    changed: beforeText !== afterText,
    before: beforeText,
    after: afterText,
  };
}

/**
 * A readable view of one mention's resolution, for previews and review screens.
 *
 * @example
 * // "1 lb boneless chicken thighs"
 * { status: "AUTO_RESOLVED", conceptId: "<chicken thigh>", conceptName: "chicken thigh", attributes: ["bone:boneless"], preparations: [], candidateCount: 1, score: 0.833,
 *   text: "chicken thigh (bone: boneless)", highlights: [{ start: 5, end: 13, text: "boneless" }, { start: 14, end: 28, text: "chicken thighs" }] }
 */
export interface ResolutionSummary {
  status: MentionStatus;
  conceptId: string | null;
  conceptName: string | null;
  /** "definition:value" keys, sorted. */
  attributes: string[];
  /** Preparation keys with degree: "chop", "chop (fine)". */
  preparations: string[];
  candidateCount: number;
  score: number | null;
  text: string;
  /** Spans that explain the reading (attributes, preparations, and unresolved words), for highlighting. */
  highlights: TextSpan[];
}

/**
 * @example
 * summarizeResolution(mention, context).text // "powdered sugar" or "unresolved: calamansi juice"
 */
export function summarizeResolution(
  mention: SegmentResolution | undefined,
  context: ResolverContext
): ResolutionSummary {
  const top = mention?.resolution.candidates[0];
  if (!mention || !top) {
    const unresolved = mention?.resolution.unresolved ?? [];
    return {
      status: mention?.status ?? "UNRESOLVED",
      conceptId: null,
      conceptName: null,
      attributes: [],
      preparations: [],
      candidateCount: 0,
      score: null,
      text: unresolved.length
        ? `unresolved: ${unresolved.map((span) => span.text).join(", ")}`
        : "unresolved",
      highlights: unresolved,
    };
  }

  const conceptName =
    context.ontology.concept(top.conceptId)?.canonicalName ?? top.conceptId;
  const attributes = [
    ...new Set(
      top.attributes.map((attribute) => {
        const value = context.attributeValues.get(attribute.attributeValueId);
        return value
          ? `${value.definitionKey}:${value.key}`
          : attribute.attributeValueId;
      })
    ),
  ].sort();
  const preparations = top.preparations.map((preparation) => {
    const key =
      context.preparations.get(preparation.preparationId)?.key ??
      preparation.preparationId;
    return preparation.degreeKey ? `${key} (${preparation.degreeKey})` : key;
  });
  const details = [
    ...attributes.map((attribute) => attribute.replace(":", ": ")),
    ...preparations,
  ];
  const alternatives =
    mention.resolution.candidates.length > 1
      ? ` or ${mention.resolution.candidates.length - 1} other`
      : "";

  return {
    status: mention.status,
    conceptId: top.conceptId,
    conceptName,
    attributes,
    preparations,
    candidateCount: mention.resolution.candidates.length,
    score: top.score,
    text: `${conceptName}${details.length ? ` (${details.join(", ")})` : ""}${alternatives}`,
    highlights: [
      ...top.attributes.flatMap((attribute) =>
        attribute.span ? [attribute.span] : []
      ),
      ...top.preparations.map((preparation) => preparation.span),
      ...top.unresolved,
    ].sort((a, b) => a.start - b.start),
  };
}

export interface ResolutionDiff {
  changed: boolean;
  newlyResolved: boolean;
  conceptChanged: boolean;
  attributesChanged: boolean;
  becameAmbiguous: boolean;
  becameUnresolved: boolean;
  before: ResolutionSummary;
  after: ResolutionSummary;
}

/**
 * How a decision changes one mention: compares the resolution before (old snapshot) and after (new snapshot).
 *
 * @example
 * // "2 tbsp confectioners sugar" before and after the alias "confectioners sugar" -> powdered sugar
 * { changed: true, newlyResolved: true, conceptChanged: true, attributesChanged: false, becameAmbiguous: false, becameUnresolved: false,
 *   before: { status: "UNRESOLVED", text: "unresolved: confectioners sugar", ... }, after: { status: "AUTO_RESOLVED", text: "powdered sugar", ... } }
 */
export function diffResolution(
  before: SegmentResolution | undefined,
  after: SegmentResolution | undefined,
  beforeContext: ResolverContext,
  afterContext: ResolverContext
): ResolutionDiff {
  const beforeSummary = summarizeResolution(before, beforeContext);
  const afterSummary = summarizeResolution(after, afterContext);

  const newlyResolved =
    beforeSummary.status !== "AUTO_RESOLVED" &&
    afterSummary.status === "AUTO_RESOLVED";
  const conceptChanged = beforeSummary.conceptId !== afterSummary.conceptId;
  const attributesChanged =
    !conceptChanged &&
    beforeSummary.attributes.join("|") !== afterSummary.attributes.join("|");
  const becameAmbiguous =
    afterSummary.candidateCount > 1 && beforeSummary.candidateCount <= 1;
  const becameUnresolved =
    afterSummary.status === "UNRESOLVED" &&
    beforeSummary.status !== "UNRESOLVED";
  const changed =
    newlyResolved ||
    conceptChanged ||
    attributesChanged ||
    becameAmbiguous ||
    becameUnresolved ||
    beforeSummary.status !== afterSummary.status ||
    beforeSummary.preparations.join("|") !==
      afterSummary.preparations.join("|");

  return {
    changed,
    newlyResolved,
    conceptChanged,
    attributesChanged,
    becameAmbiguous,
    becameUnresolved,
    before: beforeSummary,
    after: afterSummary,
  };
}

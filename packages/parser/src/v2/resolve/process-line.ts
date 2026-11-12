import type { ResolverContext } from "./context.js";
import { type SegmentResolution, resolveSegment } from "./resolve-segment.js";

import type { IngredientLineSyntax, ParseMode } from "../ast/types.js";
import { parseLine } from "../parse-line.js";

/**
 * A parsed line and its mentions.
 *
 * @example
 * // "1 tbsp butter and 2 tbsp olive oil"
 * { line: <syntax tree>, mentions: [{ segmentIndex: 0, status: "AUTO_RESOLVED", ... }, { segmentIndex: 1, status: "AUTO_RESOLVED", ... }] }
 */
export interface IngredientLineResult {
  line: IngredientLineSyntax;
  mentions: SegmentResolution[];
}

export interface ProcessLineResult extends IngredientLineResult {
  /** Other segmentations in EXPLORATORY mode, best first; empty in CONSERVATIVE mode. */
  alternatives: IngredientLineResult[];
}

const STATUS_RANK: Record<SegmentResolution["status"], number> = {
  AUTO_RESOLVED: 0,
  NEEDS_REVIEW: 1,
  UNRESOLVED: 2,
};

function rank(result: IngredientLineResult): [number, number] {
  const worstStatus = Math.max(
    0,
    ...result.mentions.map((mention) => STATUS_RANK[mention.status])
  );
  const scores = result.mentions.map(
    (mention) => mention.resolution.candidates[0]?.score ?? 0
  );
  const meanScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
  return [worstStatus, -meanScore];
}

/**
 * Parses and resolves one raw ingredient line: the facade the scripts, the backfill, and (from Phase 5) the queue use. In EXPLORATORY mode every segmentation is resolved and ranked: fewest unresolved mentions first, then highest mean score.
 *
 * @example
 * const { mentions } = processIngredientLine("1 cup finely chopped parsley", context);
 * mentions[0].resolution.candidates[0].preparations // [{ preparationId: "<chop>", degreeKey: "fine", position: "PRE_HEAD", ... }]
 */
export function processIngredientLine(
  raw: string,
  context: ResolverContext,
  {
    mode = "CONSERVATIVE",
    segmentationLimit,
  }: { mode?: ParseMode; segmentationLimit?: number } = {}
): ProcessLineResult {
  const results = parseLine(raw, {
    lexicon: context.lexicon,
    mode,
    segmentationLimit,
  }).map((line) => ({
    line,
    mentions: line.segments.flatMap((segment, index) =>
      resolveSegment(segment, line, index, context)
    ),
  }));

  const ordered =
    mode === "CONSERVATIVE"
      ? results
      : results
          .map((result, order) => ({ result, order, key: rank(result) }))
          .sort(
            (a, b) =>
              a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.order - b.order
          )
          .map(({ result }) => result);

  const [best, ...alternatives] = ordered;
  if (!best) throw new Error("parseLine returned no segmentations");
  return { ...best, alternatives };
}

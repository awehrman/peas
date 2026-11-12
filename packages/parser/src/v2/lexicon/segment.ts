import type { ParseMode } from "../ast/types.js";

import type { LexiconMatch, MatchesByStart } from "./types.js";

export const DEFAULT_SEGMENTATION_LIMIT = 8;
const MAX_EXPLORED_SEGMENTATIONS = 256;

function groupByTokenStart(matches: LexiconMatch[]): Map<number, LexiconMatch[]> {
  const byStart = new Map<number, LexiconMatch[]>();
  for (const match of matches) {
    const list = byStart.get(match.tokenStart) ?? [];
    list.push(match);
    byStart.set(match.tokenStart, list);
  }
  for (const list of byStart.values()) {
    list.sort((a, b) => b.tokenEnd - a.tokenEnd);
  }
  return byStart;
}

function toMatchesByStart(chosen: LexiconMatch[]): MatchesByStart {
  return new Map(chosen.map((match) => [match.start, match]));
}

/** Leftmost, then longest: one segmentation with no overlapping matches. */
function conservativeSegmentation(
  byStart: Map<number, LexiconMatch[]>,
  tokenCount: number
): LexiconMatch[] {
  const chosen: LexiconMatch[] = [];
  let index = 0;
  while (index < tokenCount) {
    const longest = byStart.get(index)?.[0];
    if (longest) {
      chosen.push(longest);
      index = longest.tokenEnd;
    } else {
      index += 1;
    }
  }
  return chosen;
}

interface Candidate {
  chosen: LexiconMatch[];
  unknownTokens: number;
}

/**
 * Explores every way to cover the tokens with non-overlapping matches
 * (longest choices first), then ranks by fewest unexplained tokens and fewest
 * items. Ties keep exploration order, so the conservative choice ranks first.
 */
function exploratorySegmentations(
  byStart: Map<number, LexiconMatch[]>,
  tokenCount: number
): Candidate[] {
  const results: Candidate[] = [];

  function explore(index: number, chosen: LexiconMatch[], unknownTokens: number): void {
    if (results.length >= MAX_EXPLORED_SEGMENTATIONS) return;
    if (index >= tokenCount) {
      results.push({ chosen, unknownTokens });
      return;
    }
    const options = byStart.get(index) ?? [];
    for (const match of options) {
      explore(match.tokenEnd, [...chosen, match], unknownTokens);
    }
    // Leaving matched tokens unexplained only helps if it frees an
    // overlapping match that starts later.
    const longestEnd = options[0]?.tokenEnd ?? index + 1;
    let freesOverlap = options.length === 0;
    for (let later = index + 1; later < longestEnd && !freesOverlap; later++) {
      freesOverlap = byStart.has(later);
    }
    if (freesOverlap) explore(index + 1, chosen, unknownTokens + 1);
  }

  explore(0, [], 0);

  return results
    .map((candidate, order) => ({ candidate, order }))
    .sort(
      (a, b) =>
        a.candidate.unknownTokens - b.candidate.unknownTokens ||
        a.candidate.chosen.length - b.candidate.chosen.length ||
        a.order - b.order
    )
    .map(({ candidate }) => candidate);
}

export function segmentations(
  matches: LexiconMatch[],
  tokenCount: number,
  mode: ParseMode,
  limit = DEFAULT_SEGMENTATION_LIMIT
): MatchesByStart[] {
  const byStart = groupByTokenStart(matches);

  if (mode === "CONSERVATIVE") {
    return [toMatchesByStart(conservativeSegmentation(byStart, tokenCount))];
  }

  const seen = new Set<string>();
  const unique: MatchesByStart[] = [];
  for (const candidate of exploratorySegmentations(byStart, tokenCount)) {
    const key = candidate.chosen.map((m) => `${m.start}-${m.end}`).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(toMatchesByStart(candidate.chosen));
    if (unique.length >= limit) break;
  }
  return unique;
}

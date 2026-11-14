import type {
  BookMatchStatus,
  SourceKind,
  UrlCheckStatus,
} from "@prisma/client";

export interface RankableSource {
  sourceId: string;
  kind: SourceKind;
  bookMatchStatus: BookMatchStatus | null;
  urlCheckStatus: UrlCheckStatus | null;
}

/**
 * Preference order for a note's primary source, lower is better: an identified book, an unmatched book title, a reachable URL, an unchecked URL, a failed or blocked URL, then other text.
 *
 * @example
 * sourceRank({ sourceId: "s1", kind: "BOOK", bookMatchStatus: "CONFIRMED", urlCheckStatus: null }) // 0
 */
export function sourceRank(source: RankableSource): number {
  if (source.kind === "BOOK") {
    return source.bookMatchStatus && source.bookMatchStatus !== "UNMATCHED" ? 0 : 1;
  }
  if (source.kind === "URL") {
    if (source.urlCheckStatus === "REACHABLE") return 2;
    if (source.urlCheckStatus === "UNCHECKED" || !source.urlCheckStatus) return 3;
    return 4;
  }
  return 5;
}

/** True for URLs that failed their last check or were refused; they are kept but never chosen as primary while a better source exists. */
export function isInactiveSource(source: RankableSource): boolean {
  return (
    source.kind === "URL" &&
    (source.urlCheckStatus === "UNREACHABLE" || source.urlCheckStatus === "BLOCKED")
  );
}

/**
 * Picks the primary source for a note. Ties keep the current primary, so merging a second URL never flips a stable choice. Choosing a primary source never decides which note's content is kept.
 *
 * @example
 * choosePrimarySource([url, book], url.sourceId) // book.sourceId
 */
export function choosePrimarySource(
  sources: readonly RankableSource[],
  currentPrimaryId: string | null
): string | null {
  if (sources.length === 0) return null;
  let best: RankableSource | null = null;
  for (const source of sources) {
    if (!best) {
      best = source;
      continue;
    }
    const rank = sourceRank(source);
    const bestRank = sourceRank(best);
    if (rank < bestRank) best = source;
    else if (rank === bestRank && source.sourceId === currentPrimaryId) best = source;
  }
  return best?.sourceId ?? null;
}

import { normalizeSourceText } from "./content-hash.js";
import { type ExtractedIsbn, extractIsbns } from "./isbn.js";
import type { BookCandidate } from "./schemas.js";

const LEADING_ARTICLE = /^(the|a|an)\s+/;

/**
 * Comparable form of a title: normalized, without a leading article.
 *
 * @example
 * titleKey("The Joy of Cooking") // "joy of cooking"
 */
export function titleKey(title: string): string {
  return normalizeSourceText(title).replace(LEADING_ARTICLE, "");
}

/** Main title only: text before a subtitle separator. */
function mainTitle(title: string): string {
  return title.split(/\s*[:–—]\s+|\s+-\s+/)[0] ?? title;
}

function tokens(value: string): Set<string> {
  return new Set(titleKey(value).split(" ").filter((token) => token.length > 1));
}

function jaccard(first: Set<string>, second: Set<string>): number {
  if (first.size === 0 || second.size === 0) return 0;
  let shared = 0;
  for (const token of first) if (second.has(token)) shared++;
  return shared / (first.size + second.size - shared);
}

export interface BookReference {
  /** The source string as written. */
  text: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  isbns: ExtractedIsbn[];
}

/**
 * Reads a cookbook citation: strips page references, years in parentheses, and ISBNs, then splits off an author written as "Title by Author" or "Title - Author", and a subtitle after a colon.
 *
 * @example
 * parseBookReference("Salt, Fat, Acid, Heat by Samin Nosrat p. 112")
 * // { title: "Salt, Fat, Acid, Heat", subtitle: null, author: "Samin Nosrat", isbns: [] }
 */
export function parseBookReference(text: string): BookReference {
  const isbns = extractIsbns(text);
  let working = text
    .replace(/\bISBN(?:-1[03])?:?\s*[\dXx][\dXx\- ]{8,20}[\dXx]/gi, " ")
    .replace(/[\dX][\dX\- ]{8,20}[\dX]/g, (match) =>
      extractIsbns(match).length ? " " : match
    )
    .replace(/[,;]?\s*\b(?:p|pp|pg|pgs|page|pages)\.?\s*\d+(?:\s*[-–]\s*\d+)?.*$/i, "")
    .replace(/\(\s*\d{4}\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,;.\s]+$/, "");

  let author: string | null = null;
  const byMatch = working.match(/^(.*\S)\s+by\s+(.+)$/i);
  if (byMatch?.[1] && byMatch[2]) {
    working = byMatch[1];
    author = byMatch[2].trim();
  } else {
    const dashMatch = working.match(/^(.*\S)\s+[-–—]\s+([^:]+)$/);
    if (dashMatch?.[1] && dashMatch[2] && dashMatch[2].trim().split(/\s+/).length <= 4) {
      working = dashMatch[1];
      author = dashMatch[2].trim();
    }
  }

  let subtitle: string | null = null;
  const colon = working.indexOf(":");
  if (colon > 0) {
    subtitle = working.slice(colon + 1).trim() || null;
    working = working.slice(0, colon).trim();
  }

  return { text, title: working || text.trim(), subtitle, author, isbns };
}

/** A provider record before ranking. */
export type BookCandidateInput = Omit<
  BookCandidate,
  "score" | "signals" | "evidence" | "matchedIsbn"
> & { matchedIsbn?: string | null };

function authorMatches(reference: string, authors: readonly string[]): boolean {
  const referenceTokens = tokens(reference);
  return authors.some((author) => {
    const parts = [...tokens(author)];
    const surname = parts[parts.length - 1];
    return surname !== undefined && referenceTokens.has(surname);
  });
}

/**
 * Scores provider candidates against a citation and returns them best first, each with its evidence. Title equality (ignoring articles, punctuation, and accents) dominates; matching author surnames and subtitles add; a stated author that matches nobody subtracts; edition count only breaks ties. An ISBN match scores 1.
 *
 * @example
 * rankBookCandidates(parseBookReference("The Joy of Cooking"), docs)[0].signals.titleExact // true
 */
export function rankBookCandidates(
  reference: BookReference,
  candidates: readonly BookCandidateInput[]
): BookCandidate[] {
  const referenceTitle = titleKey(reference.title);
  const referenceTokens = tokens(reference.title);
  const referenceIsbns = new Set(reference.isbns.map((isbn) => isbn.isbn13));

  const ranked = candidates.map((candidate): BookCandidate => {
    const evidence: string[] = [];
    let score = 0;

    const candidateTitle = titleKey(mainTitle(candidate.title));
    const titleExact = candidateTitle === referenceTitle;
    if (titleExact) {
      score += 0.6;
      evidence.push("Title matches exactly");
    } else {
      const overlap = jaccard(referenceTokens, tokens(mainTitle(candidate.title)));
      score += overlap * 0.5;
      if (overlap > 0) evidence.push(`Title words overlap ${Math.round(overlap * 100)}%`);
    }

    if (reference.subtitle && candidate.subtitle) {
      if (titleKey(reference.subtitle) === titleKey(candidate.subtitle)) {
        score += 0.1;
        evidence.push("Subtitle matches");
      }
    }

    let authorMatch = false;
    let authorConflict = false;
    if (reference.author) {
      authorMatch = authorMatches(reference.author, candidate.authors);
      if (authorMatch) {
        score += 0.25;
        evidence.push(`Author matches (${candidate.authors.join(", ")})`);
      } else if (candidate.authors.length > 0) {
        authorConflict = true;
        score -= 0.15;
        evidence.push("Stated author does not match");
      }
    }

    const matchedIsbn =
      candidate.matchedIsbn ??
      candidate.isbns.find((isbn) => referenceIsbns.has(isbn)) ??
      null;
    const isbnMatch = matchedIsbn !== null;
    if (isbnMatch) {
      score = 1;
      evidence.unshift(`ISBN ${matchedIsbn} matches`);
    }

    if (candidate.editionCount) {
      score += Math.min(Math.log10(candidate.editionCount + 1), 3) / 100;
    }

    return {
      ...candidate,
      matchedIsbn,
      score: Math.round(Math.max(0, Math.min(score, 1.03)) * 1000) / 1000,
      signals: { titleExact, authorMatch, authorConflict, isbnMatch },
      evidence,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

export type AutoMatchDecision =
  | { status: "MATCHED"; candidate: BookCandidate; reason: string }
  | { status: "AMBIGUOUS" }
  | { status: "NO_MATCH" };

/** Lead the only exact-title candidate needs over the runner-up to be accepted without a stated author. */
export const AUTO_MATCH_MARGIN = 0.25;

/**
 * Decides whether a ranked list can be accepted without review. The first result is never taken on rank alone: it needs an ISBN match, an exact title with a matching author, or to be the only exact-title candidate with a clear lead and no conflicting stated author.
 *
 * @example
 * decideAutoMatch(ranked) // { status: "AMBIGUOUS" } when two editions share the title
 */
export function decideAutoMatch(ranked: readonly BookCandidate[]): AutoMatchDecision {
  const [top, runnerUp] = ranked;
  if (!top || top.score < 0.3) return { status: "NO_MATCH" };
  if (top.signals.isbnMatch) {
    return { status: "MATCHED", candidate: top, reason: "ISBN match" };
  }
  if (top.signals.titleExact && top.signals.authorMatch) {
    return { status: "MATCHED", candidate: top, reason: "Exact title and author" };
  }
  const exactTitles = ranked.filter((candidate) => candidate.signals.titleExact);
  const margin = top.score - (runnerUp?.score ?? 0);
  if (
    exactTitles.length === 1 &&
    exactTitles[0] === top &&
    !top.signals.authorConflict &&
    margin >= AUTO_MATCH_MARGIN
  ) {
    return { status: "MATCHED", candidate: top, reason: "Only exact title, clear lead" };
  }
  return { status: "AMBIGUOUS" };
}

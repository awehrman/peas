import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { IngredientLineSyntax, ParseStatus } from "../../ast/types.js";
import { describeQuantity, phraseText } from "../../debug/describe.js";
import { buildLexicon, type Lexicon } from "../../lexicon/token-trie.js";
import type { LexiconSnapshot } from "../../lexicon/types.js";

export interface GoldenSegment {
  quantity?: string;
  measurementModifiers?: string;
  phrase: string;
  parentheticals?: string[];
  trailing?: string;
}

export interface GoldenExpectation {
  status: ParseStatus;
  segments: GoldenSegment[];
}

export interface GoldenCase {
  id: string;
  input: string;
  tags: string[];
  expected: GoldenExpectation;
  /** The expectation is correct but the grammar cannot produce it yet. */
  knownFailure?: boolean;
  note?: string;
}

/** Readable comparison shape: quantities via describeQuantity, phrases as written. */
export function toGolden(syntax: IngredientLineSyntax): GoldenExpectation {
  return {
    status: syntax.status,
    segments: syntax.segments.map((segment) => ({
      ...(segment.quantity ? { quantity: describeQuantity(segment.quantity) } : {}),
      ...(segment.measurementModifiers.length
        ? { measurementModifiers: phraseText(segment.measurementModifiers) }
        : {}),
      phrase: phraseText(segment.phrase),
      ...(segment.parentheticals.length
        ? {
            parentheticals: segment.parentheticals.map((parenthetical) =>
              [
                parenthetical.quantity ? `[${describeQuantity(parenthetical.quantity)}]` : "",
                phraseText(parenthetical.phrase),
              ]
                .filter(Boolean)
                .join(" ")
            ),
          }
        : {}),
      ...(segment.trailing?.phrase.length ? { trailing: phraseText(segment.trailing.phrase) } : {}),
    })),
  };
}

const fixturesDir = fileURLToPath(new URL("../../../../fixtures/", import.meta.url));

export function loadFixture<T>(relativePath: string): T {
  return JSON.parse(readFileSync(`${fixturesDir}${relativePath}`, "utf8")) as T;
}

export interface CorpusLine {
  text: string;
  occurrences: number;
  distinctNotes: number;
  sources: string[];
}

export function loadCorpus(): CorpusLine[] {
  return readFileSync(`${fixturesDir}corpus/lines.jsonl`, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CorpusLine);
}

export function loadGoldenCases(name: "structural.dev" | "structural.holdout"): GoldenCase[] {
  return loadFixture<GoldenCase[]>(`golden/${name}.json`);
}

export function loadStructuralLexicon(): Lexicon {
  return buildLexicon(loadFixture<LexiconSnapshot>("lexicon/structural.json"));
}

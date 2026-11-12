import { describe, expect, it } from "vitest";

import { describeQuantity } from "../debug/describe.js";
import { buildLexicon } from "../lexicon/token-trie.js";
import type { LexiconSnapshot } from "../lexicon/types.js";
import { parseLineBest } from "../parse-line.js";

import { loadFixture } from "./helpers/golden.js";

interface SemanticCase {
  id: string;
  input: string;
  expected: { quantity: string; concept: string | null };
}

/**
 * The resolver targets in semantic.json arrive in Phase 3; the structural
 * half (quantities) must already hold with the semantic lexicon loaded.
 */
describe("semantic golden set: structure", () => {
  const lexicon = buildLexicon(loadFixture<LexiconSnapshot>("lexicon/semantic-cases.json"));
  const { cases } = loadFixture<{ cases: SemanticCase[] }>("golden/semantic.json");

  for (const semanticCase of cases) {
    it(`${semanticCase.id}: ${semanticCase.input}`, () => {
      const [segment] = parseLineBest(semanticCase.input, { lexicon }).segments;
      expect(segment?.quantity ? describeQuantity(segment.quantity) : undefined).toBe(
        semanticCase.expected.quantity
      );
    });
  }
});

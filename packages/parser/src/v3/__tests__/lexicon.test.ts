import { describe, expect, it } from "vitest";

import { normalizeText } from "../normalize/normalize-text.js";
import { tokenize } from "../normalize/tokenize.js";
import { segmentations } from "../lexicon/segment.js";
import { buildLexicon } from "../lexicon/token-trie.js";

const lexicon = buildLexicon({
  revision: 3,
  entries: [
    { id: "whole-milk", text: "whole milk", role: "FOOD" },
    { id: "milk", text: "milk", role: "FOOD" },
    { id: "whole", text: "whole", role: "ATTRIBUTE" },
    { id: "flat-leaf-parsley", text: "flat-leaf parsley", role: "FOOD" },
    { id: "green-color", text: "green", role: "ATTRIBUTE" },
    { id: "green-unripe", text: "green", role: "ATTRIBUTE" },
    { id: "proposed-skim", text: "skim milk", role: "FOOD", status: "PROPOSED" },
  ],
});

function tokensOf(text: string) {
  return tokenize(normalizeText(text).text);
}

describe("buildLexicon", () => {
  it("finds overlapping and nested matches", () => {
    const tokens = tokensOf("1 cup whole milk");
    const matches = lexicon.match(tokens, "CONSERVATIVE").map((m) => m.entryIds.join("+"));
    expect(matches).toEqual(["whole", "whole-milk", "milk"]);
  });

  it("matches case-insensitively and only with the same hyphenation", () => {
    expect(lexicon.match(tokensOf("Flat-Leaf Parsley"), "CONSERVATIVE")).toHaveLength(1);
    expect(lexicon.match(tokensOf("flat leaf parsley"), "CONSERVATIVE")).toHaveLength(0);
  });

  it("merges entries that share a phrase into one ambiguous match", () => {
    const [match] = lexicon.match(tokensOf("green apples"), "CONSERVATIVE");
    expect(match?.entryIds).toEqual(["green-color", "green-unripe"]);
    expect(match?.roles).toEqual(["ATTRIBUTE"]);
  });

  it("ignores PROPOSED entries unless exploring", () => {
    expect(lexicon.match(tokensOf("skim milk"), "CONSERVATIVE").map((m) => m.entryIds[0])).toEqual([
      "milk",
    ]);
    expect(
      lexicon.match(tokensOf("skim milk"), "EXPLORATORY").map((m) => m.entryIds[0])
    ).toContain("proposed-skim");
  });
});

describe("segmentations", () => {
  const tokens = tokensOf("whole milk");
  const matches = lexicon.match(tokens, "EXPLORATORY");

  it("picks leftmost-longest in conservative mode", () => {
    const [only] = segmentations(matches, tokens.length, "CONSERVATIVE");
    expect([...(only?.values() ?? [])].map((m) => m.entryIds[0])).toEqual(["whole-milk"]);
  });

  it("returns ranked alternatives in exploratory mode", () => {
    const results = segmentations(matches, tokens.length, "EXPLORATORY");
    expect(results.map((r) => [...r.values()].map((m) => m.entryIds[0]))).toEqual([
      ["whole-milk"],
      ["whole", "milk"],
      ["milk"],
    ]);
  });

  it("respects the limit", () => {
    expect(segmentations(matches, tokens.length, "EXPLORATORY", 1)).toHaveLength(1);
  });
});

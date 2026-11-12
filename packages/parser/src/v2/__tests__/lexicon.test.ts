import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { normalizeText } from "../normalize/normalize-text.js";
import { tokenize } from "../normalize/tokenize.js";
import { segmentations } from "../lexicon/segment.js";
import { buildLexicon } from "../lexicon/token-trie.js";

const ids = {
  wholeMilk: randomUUID(),
  milk: randomUUID(),
  whole: randomUUID(),
  flatLeafParsley: randomUUID(),
  greenColor: randomUUID(),
  greenUnripe: randomUUID(),
  proposedSkim: randomUUID(),
};

const lexicon = buildLexicon({
  revision: 3,
  entries: [
    { id: ids.wholeMilk, text: "whole milk", role: "FOOD" },
    { id: ids.milk, text: "milk", role: "FOOD" },
    { id: ids.whole, text: "whole", role: "ATTRIBUTE" },
    { id: ids.flatLeafParsley, text: "flat-leaf parsley", role: "FOOD" },
    { id: ids.greenColor, text: "green", role: "ATTRIBUTE" },
    { id: ids.greenUnripe, text: "green", role: "ATTRIBUTE" },
    { id: ids.proposedSkim, text: "skim milk", role: "FOOD", status: "PROPOSED" },
  ],
});

function tokensOf(text: string) {
  return tokenize(normalizeText(text).text);
}

describe("buildLexicon", () => {
  it("finds overlapping and nested matches", () => {
    const tokens = tokensOf("1 cup whole milk");
    const matches = lexicon.match(tokens, "CONSERVATIVE").map((m) => m.entryIds.join("+"));
    expect(matches).toEqual([ids.whole, ids.wholeMilk, ids.milk]);
  });

  it("matches case-insensitively and only with the same hyphenation", () => {
    expect(lexicon.match(tokensOf("Flat-Leaf Parsley"), "CONSERVATIVE")).toHaveLength(1);
    expect(lexicon.match(tokensOf("flat leaf parsley"), "CONSERVATIVE")).toHaveLength(0);
  });

  it("merges entries that share a phrase into one ambiguous match", () => {
    const [match] = lexicon.match(tokensOf("green apples"), "CONSERVATIVE");
    expect(match?.entryIds).toEqual([ids.greenColor, ids.greenUnripe]);
    expect(match?.roles).toEqual(["ATTRIBUTE"]);
  });

  it("ignores PROPOSED entries unless exploring", () => {
    expect(lexicon.match(tokensOf("skim milk"), "CONSERVATIVE").map((m) => m.entryIds[0])).toEqual([
      ids.milk,
    ]);
    expect(
      lexicon.match(tokensOf("skim milk"), "EXPLORATORY").map((m) => m.entryIds[0])
    ).toContain(ids.proposedSkim);
  });

  it("rejects entry ids that are not UUIDs", () => {
    expect(() =>
      buildLexicon({ revision: 1, entries: [{ id: "mm-heaping", text: "heaping", role: "MEASUREMENT_MODIFIER" }] })
    ).toThrow(ZodError);
  });

  it("rejects duplicate entry ids", () => {
    const id = randomUUID();
    expect(() =>
      buildLexicon({
        revision: 1,
        entries: [
          { id, text: "heaping", role: "MEASUREMENT_MODIFIER" },
          { id, text: "heaped", role: "MEASUREMENT_MODIFIER" },
        ],
      })
    ).toThrow(/Duplicate lexicon entry id/);
  });
});

describe("segmentations", () => {
  const tokens = tokensOf("whole milk");
  const matches = lexicon.match(tokens, "EXPLORATORY");

  it("picks leftmost-longest in conservative mode", () => {
    const [only] = segmentations(matches, tokens.length, "CONSERVATIVE");
    expect([...(only?.values() ?? [])].map((m) => m.entryIds[0])).toEqual([ids.wholeMilk]);
  });

  it("returns ranked alternatives in exploratory mode", () => {
    const results = segmentations(matches, tokens.length, "EXPLORATORY");
    expect(results.map((r) => [...r.values()].map((m) => m.entryIds[0]))).toEqual([
      [ids.wholeMilk],
      [ids.whole, ids.milk],
      [ids.milk],
    ]);
  });

  it("respects the limit", () => {
    expect(segmentations(matches, tokens.length, "EXPLORATORY", 1)).toHaveLength(1);
  });
});

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import type {
  IngredientLineSyntax,
  PhraseItem,
  Quantity,
  TextSpan,
} from "../ast/types.js";
import { describeSyntax } from "../debug/describe.js";
import { buildLexicon } from "../lexicon/token-trie.js";
import { parseLine, parseLineBest } from "../parse-line.js";

import { loadCorpus } from "./helpers/golden.js";

const corpus = loadCorpus();

function quantitySpans(quantity: Quantity): TextSpan[] {
  switch (quantity.kind) {
    case "EXACT":
    case "RANGE":
    case "UNSPECIFIED":
      return [quantity.span, ...(quantity.unit ? [quantity.unit.span] : [])];
    case "MEASURE_RANGE":
      return [
        quantity.span,
        ...quantitySpans(quantity.from),
        ...quantitySpans(quantity.to),
      ];
    case "APPROXIMATE":
      return [
        quantity.span,
        quantity.marker,
        ...quantitySpans(quantity.quantity),
      ];
    case "PACKAGE":
      return [
        quantity.span,
        ...(quantity.packageType ? [quantity.packageType.span] : []),
        ...(quantity.packageSize ? quantitySpans(quantity.packageSize) : []),
      ];
    case "ALTERNATIVE":
      return [quantity.span, ...quantity.options.flatMap(quantitySpans)];
    case "SUM":
      return [quantity.span, ...quantity.parts.flatMap(quantitySpans)];
  }
}

function allSpans(line: IngredientLineSyntax): TextSpan[] {
  const itemSpans = (items: PhraseItem[]) => items.map((item) => item.span);
  return [
    ...line.unparsed,
    ...line.segments.flatMap((segment) => [
      segment.span,
      ...(segment.quantity ? quantitySpans(segment.quantity) : []),
      ...itemSpans(segment.measurementModifiers),
      ...itemSpans(segment.phrase),
      ...segment.parentheticals.flatMap((p) => [
        p.span,
        ...itemSpans(p.phrase),
        ...(p.quantity ? quantitySpans(p.quantity) : []),
      ]),
      ...(segment.trailing
        ? [segment.trailing.span, ...itemSpans(segment.trailing.phrase)]
        : []),
      ...(segment.coordination ? [segment.coordination.conjunction] : []),
    ]),
  ];
}

const SAMPLE_LINES = [
  "2 cups finely chopped fresh flat-leaf parsley",
  "1½ cups flour",
  "2 (14 oz) cans tomatoes",
  "Salt and pepper to taste",
  "1 tbsp butter and 2 tbsp olive oil",
  "  ¼ cup, plus 1 tablespoon extra-virgin olive oil ",
  "🍋 zest of 1 lemon",
  "800g–1kg (1lb 12oz–2lb 4oz) bone-in venison shoulder",
  "rosemary a few sprigs",
];

describe("parse invariants", () => {
  it("never throws and always keeps the raw input", () => {
    for (const input of ["", "   ", ")))", "((", "1/", "-", "1 cup (", "😀"]) {
      const result = parseLineBest(input);
      expect(result.raw).toBe(input);
      expect(["PARSED", "PARTIAL", "FAILED"]).toContain(result.status);
    }
  });

  it("gives every span text equal to the raw slice it points at", () => {
    const lines = [...SAMPLE_LINES, ...corpus.map((row) => row.text)];
    for (const input of lines) {
      for (const span of allSpans(parseLineBest(input))) {
        expect(span.text).toBe(input.slice(span.start, span.end));
      }
    }
  });

  it("keeps structure when only case changes", () => {
    for (const input of SAMPLE_LINES) {
      const lower = describeSyntax(parseLineBest(input.toLowerCase()));
      const original = describeSyntax(parseLineBest(input));
      expect(lower.toLowerCase()).toBe(original.toLowerCase());
    }
  });

  it("parses an unknown food structurally with an empty lexicon", () => {
    const result = parseLineBest("3 tablespoons calamansi juice");
    expect(result.status).toBe("PARSED");
    expect(describeSyntax(result)).toBe("[3 tbsp] calamansi juice");
  });

  it("never changes the quantity when a lexicon entry is added", () => {
    const lexicon = buildLexicon({
      revision: 1,
      entries: [
        { id: randomUUID(), text: "flat-leaf parsley", role: "FOOD" },
        { id: randomUUID(), text: "tomatoes", role: "FOOD" },
        { id: randomUUID(), text: "olive oil", role: "FOOD" },
      ],
    });
    for (const input of SAMPLE_LINES) {
      const without = parseLineBest(input).segments.map((s) => s.quantity);
      const withLexicon = parseLineBest(input, { lexicon }).segments.map(
        (s) => s.quantity
      );
      expect(withLexicon).toEqual(without);
    }
  });

  it("returns one tree in conservative mode and several when exploring", () => {
    const lexicon = buildLexicon({
      revision: 2,
      entries: [
        { id: randomUUID(), text: "whole milk", role: "FOOD" },
        { id: randomUUID(), text: "whole", role: "ATTRIBUTE" },
        { id: randomUUID(), text: "milk", role: "FOOD" },
      ],
    });
    expect(parseLine("1 cup whole milk", { lexicon })).toHaveLength(1);
    const explored = parseLine("1 cup whole milk", {
      lexicon,
      mode: "EXPLORATORY",
    });
    expect(explored.map(describeSyntax)).toEqual([
      "[1 cup] {whole milk:FOOD}",
      "[1 cup] {whole:ATTRIBUTE} {milk:FOOD}",
      "[1 cup] whole {milk:FOOD}",
    ]);
    expect(explored.every((tree) => tree.lexiconRevision === 2)).toBe(true);
  });
});

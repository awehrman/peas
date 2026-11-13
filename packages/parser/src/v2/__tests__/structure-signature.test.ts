import { describe, expect, it } from "vitest";

import {
  structuralIssue,
  structureSignature,
} from "../knowledge/structure-signature.js";
import { parseLineBest } from "../parse-line.js";
import { buildResolverContext } from "../resolve/context.js";
import { discover } from "../knowledge/discover.js";
import { processIngredientLine } from "../resolve/process-line.js";

import { loadStructuralLexicon } from "./helpers/golden.js";

const lexicon = loadStructuralLexicon();
const parse = (line: string) => parseLineBest(line, { lexicon });
const signatureOf = (line: string) => structureSignature(parse(line));

describe("structureSignature", () => {
  it("maps a line to token classes", () => {
    expect(signatureOf("11-x-17-inch baking sheet")).toBe("N - x - N - U W U");
    expect(signatureOf("1 1/2 cups flour")).toBe("F U W");
    expect(signatureOf("½ cup sugar")).toBe("F U W");
    expect(signatureOf("1 heaping cup flour")).toBe("N L U W");
    expect(signatureOf("2 cups (500 ml) milk")).toBe("N U ( N U ) W");
    expect(signatureOf("For the sauce:")).toBe("W :");
  });

  it("clusters lines with the same shape, whatever the words, case, or trailing text", () => {
    const shapes = [
      "small handful coriander, chopped",
      "Small handful of whole black peppercorns",
      "LARGE HANDFUL BASIL",
      "small pinch saffron threads, crumbled",
    ].map(signatureOf);
    expect(new Set(shapes)).toEqual(new Set(["W U W"]));
    expect(signatureOf("2 cups flour")).not.toBe(signatureOf("2 flour"));
  });

  it("is stable across calls and does not depend on what the lexicon knows", () => {
    const line = "garlic 1 small clove, crushed";
    expect(signatureOf(line)).toBe(signatureOf(line));
    expect(structureSignature(parseLineBest(line))).toBe(signatureOf(line));
  });

  it("caps long signatures", () => {
    const signature = signatureOf(
      "800g–1kg (1lb 12oz–2lb 4oz) bone-in venison shoulder"
    );
    expect(signature.split(" ")).toHaveLength(14);
    expect(signature.startsWith("N U - N U (")).toBe(true);
  });
});

describe("structuralIssue", () => {
  it("finds numbers and units stranded in the food phrase", () => {
    expect(structuralIssue(parse("thyme 4 sprigs fresh"))).toMatchObject({
      reason: "QUANTITY_IN_PHRASE",
      signature: "W N U W",
      segmentIndex: 0,
      span: { text: "4" },
    });
    expect(structuralIssue(parse("11-x-17-inch baking sheet"))).toMatchObject({
      reason: "QUANTITY_IN_PHRASE",
      span: { text: "17" },
    });
  });

  it("no longer flags the size-word structures parser 2.1.0 learned", () => {
    for (const line of [
      "small handful coriander, chopped",
      "Small handful of whole black peppercorns",
      "garlic 1 small clove, crushed",
      "1 large can tomatoes",
    ])
      expect(structuralIssue(parse(line))).toBeNull();
  });

  it("no longer flags the measure ranges, compound measures, counted unspecified amounts, and units parser 2.2.0 learned", () => {
    for (const line of [
      "800g–1kg (1lb 12oz–2lb 4oz) bone-in venison shoulder",
      "1 lb 12 oz pork shoulder",
      "rosemary a few sprigs",
      "a few sprigs of thyme",
      "1 recipe BBQ Rub",
      "1 rack baby back ribs",
      "1 slab bacon",
    ])
      expect(structuralIssue(parse(line))).toBeNull();
  });

  it("flags headings and leaves well-formed lines alone", () => {
    expect(structuralIssue(parse("For the sauce:"))).toMatchObject({
      reason: "HEADING",
      span: { text: "For the sauce:" },
    });
    for (const line of [
      "2 cups flour",
      "2 large eggs",
      "1 (14 oz) can tomatoes",
      "2 cups (500 ml) milk",
      "Salt and pepper to taste",
    ])
      expect(structuralIssue(parse(line))).toBeNull();
  });

  it("reports unparsed text from a partial parse", () => {
    const partial = {
      ...parse("2 cups flour"),
      status: "PARTIAL" as const,
      unparsed: [{ start: 7, end: 12, text: "flour" }],
    };
    expect(structuralIssue(partial)).toMatchObject({
      reason: "UNPARSED",
      span: { text: "flour" },
    });
    expect(
      structuralIssue({ ...parse("2 cups flour"), status: "FAILED", unparsed: [] })
    ).toMatchObject({ reason: "UNPARSED", span: { text: "2 cups flour" } });
  });
});

describe("structural discoveries", () => {
  it("emits one STRUCTURAL_PATTERN keyed by signature, with the reason and parser version", () => {
    const context = buildResolverContext({
      revision: 1,
      entries: [],
      vocabulary: { definitions: [], preparations: [] },
      concepts: [],
      relationships: [],
      applicability: [],
      conceptAttributes: [],
    });
    const result = processIngredientLine("thyme 4 sprigs fresh", context);
    const structural = discover(result, context).filter(
      (discovery) => discovery.payload.type === "STRUCTURAL_PATTERN"
    );
    expect(structural).toEqual([
      {
        key: "W N U W",
        segmentIndex: 0,
        span: expect.objectContaining({ text: "4" }),
        payload: {
          type: "STRUCTURAL_PATTERN",
          signature: "W N U W",
          example: "thyme 4 sprigs fresh",
          reason: "QUANTITY_IN_PHRASE",
          parserVersion: result.line.parserVersion,
        },
      },
    ]);
    expect(
      discover(processIngredientLine("2 cups flour", context), context).some(
        (discovery) => discovery.payload.type === "STRUCTURAL_PATTERN"
      )
    ).toBe(false);
  });
});

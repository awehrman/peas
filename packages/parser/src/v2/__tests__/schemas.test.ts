import { describe, expect, it } from "vitest";

import { IngredientLineSyntaxSchema } from "../ast/schemas.js";
import { parseLine } from "../parse-line.js";

import { loadCorpus, loadGoldenCases, loadStructuralLexicon } from "./helpers/golden.js";

describe("IngredientLineSyntaxSchema", () => {
  const lexicon = loadStructuralLexicon();
  const inputs = [
    ...loadGoldenCases("structural.dev").map((goldenCase) => goldenCase.input),
    ...loadCorpus().map((row) => row.text),
  ];

  it("accepts every parse of the golden set and corpus", () => {
    for (const input of inputs) {
      for (const syntax of parseLine(input, { lexicon, mode: "EXPLORATORY" })) {
        const result = IngredientLineSyntaxSchema.safeParse(syntax);
        if (!result.success) {
          throw new Error(`${input}: ${result.error.message}`);
        }
      }
    }
  });

  it("rejects a malformed tree", () => {
    const [syntax] = parseLine("1 cup flour");
    const broken = { ...syntax, status: "DONE" };
    expect(IngredientLineSyntaxSchema.safeParse(broken).success).toBe(false);
  });
});

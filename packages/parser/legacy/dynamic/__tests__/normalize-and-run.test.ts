import { describe, expect, it } from "vitest";

import { parse as parseV1 } from "@peas/parser/v1";
import { normalizeParseResult } from "../normalize";
import { runGrammarTests, segmentsMatchExpectations } from "../run-tests";

describe("normalizeParseResult", () => {
  it("keeps v1 segments as-is, with their own rule paths", () => {
    const result = normalizeParseResult(parseV1("2 cups flour"));

    expect(result.rule).toBe("#1_ingredientLine");
    expect(result.values.map(({ type, value }) => ({ type, value }))).toEqual([
      { type: "amount", value: "2" },
      { type: "unit", value: "c" },
      { type: "ingredient", value: "flour" },
    ]);
    expect(result.values[0]?.rule).toMatch(/^#1_ingredientLine >> /);
  });

  it("flattens nested database-grammar nodes and joins rule paths", () => {
    const result = normalizeParseResult({
      rule: "#1_line",
      type: "line",
      values: [
        { rule: "#1_amount", type: "amount", values: ["1", "1/2"] },
        { rule: "#1_wrapper", type: "", values: [{ rule: "#2_ingredient", type: "ingredient", values: ["flour"] }] },
        null,
      ],
    });

    expect(result.values).toEqual([
      { rule: "#1_line >> #1_amount", type: "amount", value: "1 1/2" },
      { rule: "#1_line >> #1_wrapper >> #2_ingredient", type: "ingredient", value: "flour" },
    ]);
  });

  it("returns no segments for non-object output", () => {
    expect(normalizeParseResult("apple").values).toEqual([]);
  });
});

describe("runGrammarTests", () => {
  const parse = (input: string) => normalizeParseResult(parseV1(input));

  it("passes only when every segment matches in order (values case-insensitive)", () => {
    const suite = runGrammarTests(parse, [
      {
        id: "pass",
        reference: "2 cups flour",
        expectations: [
          { type: "amount", value: "2" },
          { type: "unit", value: "C" },
          { type: "ingredient", value: "flour" },
        ],
      },
      {
        id: "wrong-order",
        reference: "2 cups flour",
        expectations: [
          { type: "unit", value: "c" },
          { type: "amount", value: "2" },
          { type: "ingredient", value: "flour" },
        ],
      },
    ]);

    expect(suite.passed).toBe(1);
    expect(suite.total).toBe(2);
    expect(suite.results.map((result) => result.passed)).toEqual([true, false]);
  });

  it("records the error message when parsing throws", () => {
    const suite = runGrammarTests(
      () => {
        throw new Error("Expected amount");
      },
      [{ id: "t", reference: "???", expectations: [] }]
    );

    expect(suite.results[0]).toMatchObject({ passed: false, error: "Expected amount", actual: [] });
  });

  it("fails when the segment count differs", () => {
    expect(
      segmentsMatchExpectations([{ rule: "", type: "ingredient", value: "apple" }], [])
    ).toBe(false);
  });
});

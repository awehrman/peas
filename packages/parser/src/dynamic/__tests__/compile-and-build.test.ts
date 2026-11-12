import { describe, expect, it } from "vitest";

import { buildParser } from "../build-parser";
import { compileGrammar, compileRule, getDefaultFormatter } from "../compile-grammar";
import { BASIC_GRAMMAR_RULES } from "../seed-rules";
import type { GrammarRuleInput } from "../types";

describe("compileRule", () => {
  it("writes alternatives in definition order with examples and 1-based ORDER", () => {
    const rule: GrammarRuleInput = {
      name: "amount",
      label: "Amount",
      order: 0,
      definitions: [
        { type: "RULE", order: 1, example: "11", rule: "amt:digits", formatter: getDefaultFormatter("amount", "[amt]"), list: [] },
        { type: "LIST", order: 0, example: "", rule: "", formatter: "", list: ["'one'i", "'two'i"] },
      ],
    };

    const source = compileRule(rule);

    expect(source.split("\n")[0]).toBe('amount "Amount"');
    expect(source).toContain("  = 'one'i / 'two'i");
    expect(source).toContain("  / // '11'");
    expect(source).toContain("rule: `#2_amount`");
    expect(source).not.toContain("${ORDER}");
  });

  it("escapes quotes in labels", () => {
    const source = compileRule({
      name: "x",
      label: 'Say "hi"',
      order: 0,
      definitions: [{ type: "RULE", order: 0, example: "", rule: "'x'", formatter: "", list: [] }],
    });

    expect(source.split("\n")[0]).toBe('x "Say \\"hi\\""');
  });
});

describe("compileGrammar + buildParser", () => {
  it("compiles the seed rules into a working parser with normalized segments", () => {
    const source = compileGrammar(BASIC_GRAMMAR_RULES);
    expect(source.startsWith("start = ingredientLine")).toBe(true);

    const built = buildParser(source);
    if (!built.ok) throw new Error(JSON.stringify(built.errors));

    expect(built.parser.parse("11 apples").values).toEqual([
      { rule: "#1_ingredientLine >> #2_amount", type: "amount", value: "11" },
      { rule: "#1_ingredientLine >> #1_ingredient", type: "ingredient", value: "apples" },
    ]);
    expect(built.parser.parse("One apple").values.map((segment) => segment.value)).toEqual([
      "one",
      "apple",
    ]);
  });

  it("returns located errors instead of throwing for a broken grammar", () => {
    const built = buildParser('start = missingRule\n\nother = "x"');

    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.errors[0]?.message).toMatch(/missingRule/);
    expect(built.errors[0]?.line).toBe(1);
  });

  it("returns a syntax error for malformed source", () => {
    const built = buildParser("start = (");

    expect(built.ok).toBe(false);
  });
});

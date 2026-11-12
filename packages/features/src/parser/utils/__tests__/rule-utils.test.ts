import { describe, expect, it } from "vitest";

import { formatKeyword, formatKeywordList } from "../keyword-list";
import { getUndefinedReferences, toStartCase, tokenizeRule } from "../rule-syntax";

const ruleNames = new Set(["amount", "ingredient", "_"]);

describe("tokenizeRule", () => {
  it("classifies labels, defined and missing rules, literals and syntax", () => {
    const tokens = tokenizeRule("amt:amount* _ ing:ingredient 'of'i [a-z]i unit", ruleNames)
      .filter((token) => token.kind !== "space")
      .map((token) => [token.text, token.kind]);

    expect(tokens).toEqual([
      ["amt:", "label"],
      ["amount", "defined"],
      ["*", "syntax"],
      ["_", "defined"],
      ["ing:", "label"],
      ["ingredient", "defined"],
      ["'of'i", "literal"],
      ["[a-z]i", "class"],
      ["unit", "missing"],
    ]);
  });

  it("does not treat words inside literals or code blocks as rule references", () => {
    expect(getUndefinedReferences("'cup' { return cup; } amount", ruleNames)).toEqual([]);
  });

  it("lists each undefined reference once", () => {
    expect(getUndefinedReferences("unit _ unit ing:food", ruleNames)).toEqual(["unit", "food"]);
  });
});

describe("toStartCase", () => {
  it.each([
    ["amountKeyword", "Amount Keyword"],
    ["ingredient_line", "Ingredient Line"],
    ["_", ""],
  ])("turns %s into %s", (input, expected) => {
    expect(toStartCase(input)).toBe(expected);
  });
});

describe("formatKeywordList", () => {
  it("quotes bare keywords case-insensitively and keeps pre-quoted entries", () => {
    expect(formatKeyword("cup")).toBe("'cup'i");
    expect(formatKeyword("'Cup'")).toBe("'Cup'");
    expect(formatKeyword("$('fl' _ 'oz')")).toBe("$('fl' _ 'oz')");
    expect(formatKeyword("chef's")).toBe("'chef\\'s'i");
  });

  it("splits on commas, then slashes, dedupes and sorts longest first", () => {
    expect(formatKeywordList("tbsp, tablespoon", ["'tbsp'i"])).toEqual(["'tablespoon'i", "'tbsp'i"]);
    expect(formatKeywordList("one/two", [])).toEqual(["'one'i", "'two'i"]);
  });

  it("ignores empty entries", () => {
    expect(formatKeywordList(" , ", ["'a'i"])).toEqual(["'a'i"]);
  });
});

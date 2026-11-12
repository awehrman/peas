import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  STATIC_V1_PARSER_ID,
  resetParserResolver,
  resolveIngredientParser,
} from "../../ingredient/parser-resolver";

vi.mock("@peas/parser/v1/minified", () => ({
  parse: vi.fn(() => ({
    rule: "#1_ingredientLine",
    type: "line",
    values: [
      { rule: "#1_ingredientLine >> #1_amount", type: "amount", value: 2 },
      {
        rule: "#1_ingredientLine >> #2_ingredient",
        type: "ingredient",
        value: "salt",
      },
    ],
  })),
}));

describe("resolveIngredientParser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetParserResolver();
  });

  it("returns the static v1 parser", async () => {
    const parser = await resolveIngredientParser();

    expect(parser.id).toBe(STATIC_V1_PARSER_ID);
  });

  it("stringifies segment values from the v1 parser", async () => {
    const parser = await resolveIngredientParser();

    expect(parser.parse("2 salt").values).toEqual([
      { rule: "#1_ingredientLine >> #1_amount", type: "amount", value: "2" },
      {
        rule: "#1_ingredientLine >> #2_ingredient",
        type: "ingredient",
        value: "salt",
      },
    ]);
  });

  it("reuses the loaded parser across calls", async () => {
    const first = await resolveIngredientParser();
    const second = await resolveIngredientParser();

    expect(second).toBe(first);
  });
});

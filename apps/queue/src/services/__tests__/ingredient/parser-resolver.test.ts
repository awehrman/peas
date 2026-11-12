import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PARSER_SETTINGS_TTL_MS,
  STATIC_V1_PARSER_ID,
  resetParserResolver,
  resolveIngredientParser,
} from "../../ingredient/parser-resolver";

vi.mock("@peas/database", () => ({
  getActiveParserConfig: vi.fn(),
}));

vi.mock("@peas/parser/v1/minified", () => ({
  parse: vi.fn(() => ({
    rule: "#1_ingredientLine",
    type: "line",
    values: [{ rule: "#1_ingredientLine >> #2_ingredient", type: "ingredient", value: "salt" }],
  })),
}));

const VALID_GRAMMAR = `
start = ing:$([a-z]i+) {
  return { rule: '#1_line', type: 'line', values: [{ rule: '#1_ingredient', type: 'ingredient', values: [ing] }] };
}
`;

describe("resolveIngredientParser", () => {
  let getActiveParserConfig: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();
    resetParserResolver();
    const database = await import("@peas/database");
    getActiveParserConfig = vi.mocked(database.getActiveParserConfig);
  });

  it("uses static v1 when the setting says so", async () => {
    getActiveParserConfig.mockResolvedValue({ activeParser: "STATIC_V1", grammarVersion: null });

    const parser = await resolveIngredientParser();

    expect(parser.id).toBe(STATIC_V1_PARSER_ID);
    expect(parser.parse("salt").values).toEqual([
      { rule: "#1_ingredientLine >> #2_ingredient", type: "ingredient", value: "salt" },
    ]);
  });

  it("builds and normalizes the published database grammar", async () => {
    getActiveParserConfig.mockResolvedValue({
      activeParser: "DATABASE",
      grammarVersion: { id: "v1", hash: "hash-1", source: VALID_GRAMMAR },
    });

    const parser = await resolveIngredientParser();

    expect(parser.id).toBe("grammar:v1");
    expect(parser.parse("Basil").values).toEqual([
      { rule: "#1_line >> #1_ingredient", type: "ingredient", value: "Basil" },
    ]);
  });

  it("falls back to static v1 when the published grammar does not compile", async () => {
    getActiveParserConfig.mockResolvedValue({
      activeParser: "DATABASE",
      grammarVersion: { id: "broken", hash: "hash-2", source: "start = missingRule" },
    });
    const logger = { log: vi.fn() };

    const parser = await resolveIngredientParser(logger);

    expect(parser.id).toBe(STATIC_V1_PARSER_ID);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("does not compile"), "error");
  });

  it("falls back to static v1 when settings cannot be read", async () => {
    getActiveParserConfig.mockRejectedValue(new Error("connection refused"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const parser = await resolveIngredientParser();

    expect(parser.id).toBe(STATIC_V1_PARSER_ID);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("connection refused"));
    warn.mockRestore();
  });

  it("re-reads the setting only after the TTL expires", async () => {
    vi.useFakeTimers();
    getActiveParserConfig.mockResolvedValue({ activeParser: "STATIC_V1", grammarVersion: null });

    await resolveIngredientParser();
    await resolveIngredientParser();
    expect(getActiveParserConfig).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PARSER_SETTINGS_TTL_MS + 1);
    await resolveIngredientParser();
    expect(getActiveParserConfig).toHaveBeenCalledTimes(2);
  });
});

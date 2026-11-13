import { PARSER_VERSION } from "@peas/parser/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BUTTER_ID, fixtureContext } from "./v2-fixture";

vi.mock("../../ingredient/lexicon-cache", () => ({
  getResolverContext: vi.fn(async () => fixtureContext()),
}));

vi.mock("../../../workers/core/cache/action-cache", () => ({
  CACHE_OPTIONS: { INGREDIENT_PARSING: { ttl: 1 } },
  actionCache: {
    getOrSet: vi.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
    invalidateByPattern: vi.fn(async () => 2),
    getStats: vi.fn(() => ({ memorySize: 3, memoryKeys: ["action:parse_ingredient_line:v2:x", "other"] })),
  },
}));

import { actionCache } from "../../../workers/core/cache/action-cache";
import { CachedIngredientParser, cacheKey } from "../../ingredient/cached-ingredient-parser";
import { V2_PARSER_ID, processLine } from "../../ingredient/ingredient-processor";

const logger = { log: vi.fn() };

describe("ingredient processor and cached parser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("processes a line in conservative mode with the given context", async () => {
    const processed = await processLine("2 tbsp butter", logger, async () => fixtureContext());
    expect(processed).toMatchObject({ revision: 7, parserVersion: V2_PARSER_ID });
    expect(processed.result.mentions[0]).toMatchObject({ status: "AUTO_RESOLVED" });
    expect(processed.result.line.mode).toBe("CONSERVATIVE");
    expect(V2_PARSER_ID).toBe(`v2:${PARSER_VERSION}`);
  });

  it("keys the cache by parser version, revision, and lowercased line", async () => {
    expect(cacheKey("  1 Tbsp Butter ", 15)).toBe(`action:parse_ingredient_line:v2:${PARSER_VERSION}:15:1 tbsp butter`);

    await CachedIngredientParser.parseIngredientLine("1 tbsp butter");
    expect(actionCache.getOrSet).toHaveBeenCalledWith(cacheKey("1 tbsp butter", 7), expect.any(Function), { ttl: 1 });
    const processed = await CachedIngredientParser.parseIngredientLine("2 tbsp butter", {}, logger);
    expect(actionCache.getOrSet).toHaveBeenCalledWith(cacheKey("2 tbsp butter", 7), expect.any(Function), { ttl: 1 });
    expect(processed.result.mentions[0]?.resolution.candidates[0]?.conceptId).toBe(BUTTER_ID);
  });

  it("can skip the cache, parse several lines, invalidate, and report stats", async () => {
    await CachedIngredientParser.parseIngredientLine("1 cup flour", { cacheResults: false });
    expect(actionCache.getOrSet).not.toHaveBeenCalled();

    const results = await CachedIngredientParser.parseIngredientLines(["1 cup flour", "2 tbsp butter"]);
    expect(results.map((result) => result.result.line.raw)).toEqual(["1 cup flour", "2 tbsp butter"]);

    expect(await CachedIngredientParser.invalidateIngredientCache("Flour")).toBe(2);
    expect(actionCache.invalidateByPattern).toHaveBeenCalledWith("action:parse_ingredient_line:*flour*");
    await CachedIngredientParser.invalidateIngredientCache();
    expect(actionCache.invalidateByPattern).toHaveBeenLastCalledWith("action:parse_ingredient_line:*");

    expect(CachedIngredientParser.getCacheStats()).toEqual({
      totalIngredientKeys: 1,
      ingredientKeys: ["action:parse_ingredient_line:v2:x"],
      totalMemoryKeys: 3,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";
import { BUTTER_ID, fixtureContext } from "../../v2-fixture";
import { actionCache } from "../../../../../workers/core/cache/action-cache";
import { createIngredientMetrics } from "../../../../ingredient/ingredient-metrics";
import {
  parseIngredientLine,
  readV2Result,
} from "../../../../ingredient/actions/parse-ingredient-line/service";

vi.mock("../../../../ingredient/lexicon-cache", () => ({
  getResolverContext: vi.fn(async () => fixtureContext()),
}));

vi.mock("../../../../../workers/core/cache/action-cache", () => ({
  CACHE_OPTIONS: { INGREDIENT_PARSING: {} },
  actionCache: {
    getOrSet: vi.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
    invalidateByPattern: vi.fn(async () => 3),
    getStats: vi.fn(() => ({ memoryKeys: [], memorySize: 0 })),
  },
}));


const logger = { log: vi.fn() };

function job(reference: string, metadata: Record<string, unknown> = {}): IngredientJobData {
  return {
    noteId: "note-1",
    ingredientReference: reference,
    lineIndex: 0,
    blockIndex: 0,
    parseStatus: "AWAITING_PARSING",
    isActive: true,
    metadata,
  };
}

describe("parseIngredientLine (v2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores the validated v2 result, the revision, and the parser version", async () => {
    const result = await parseIngredientLine(job("2 tbsp butter", { importId: "i1" }), logger);

    expect(result.parseStatus).toBe("COMPLETED_SUCCESSFULLY");
    expect(result.metadata).toMatchObject({
      importId: "i1",
      lexiconRevision: 7,
      parserVersion: expect.stringMatching(/^v2:/),
      resolutionStatuses: ["AUTO_RESOLVED"],
      unknownTokens: 0,
      candidateCount: 1,
    });
    const v2 = readV2Result(result.metadata);
    expect(v2?.mentions[0]?.resolution.candidates[0]?.conceptId).toBe(BUTTER_ID);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("[V2_PARSE]"));
  });

  it("records each parse in the ingredient metrics window", async () => {
    const metrics = createIngredientMetrics();
    await parseIngredientLine(job("2 tbsp butter"), logger, metrics);
    await parseIngredientLine(job("3 tablespoons calamansi juice"), logger, metrics);

    expect(metrics.summary()).toMatchObject({
      lineCount: 2,
      structuralSuccessShare: 1,
      resolutionCoverage: { AUTO_RESOLVED: 1, UNRESOLVED: 1 },
      unknownTokens: 1,
      lexiconRevision: 7,
    });
  });

  it("keeps the job successful when the line parses but does not resolve", async () => {
    const result = await parseIngredientLine(job("3 tablespoons calamansi juice"), logger);

    expect(result.parseStatus).toBe("COMPLETED_SUCCESSFULLY");
    expect(result.metadata).toMatchObject({ resolutionStatuses: ["UNRESOLVED"], unknownTokens: 1 });
  });

  it("marks lines the grammar cannot parse as completed with errors", async () => {
    const result = await parseIngredientLine(job("   "), logger);
    expect(result.parseStatus).toBe("COMPLETED_WITH_ERROR");
  });

  it("clears the parse cache on request", async () => {
    await parseIngredientLine(job("2 tbsp butter", { clearCache: true }), logger);
    expect(actionCache.invalidateByPattern).toHaveBeenCalledWith("action:parse_ingredient_line:*");
  });

  it("reports parser failures as errors in the job data", async () => {
    vi.mocked(actionCache.getOrSet).mockRejectedValueOnce(new Error("cache down"));
    const result = await parseIngredientLine(job("2 tbsp butter"), logger);
    expect(result).toMatchObject({ parseStatus: "COMPLETED_WITH_ERROR", metadata: { error: "cache down" } });
  });

  it("requires a note and a line", async () => {
    await expect(parseIngredientLine({ ...job("x"), noteId: "" }, logger)).rejects.toThrow("No note ID");
    await expect(parseIngredientLine({ ...job(""), ingredientReference: "" }, logger)).rejects.toThrow("No ingredient reference");
  });
});

describe("readV2Result", () => {
  it("rejects missing or malformed results", () => {
    expect(readV2Result(undefined)).toBeNull();
    expect(readV2Result({ v2Result: { line: {}, mentions: [] } })).toBeNull();
    expect(readV2Result({ v2Result: { mentions: "nope" } })).toBeNull();
  });
});

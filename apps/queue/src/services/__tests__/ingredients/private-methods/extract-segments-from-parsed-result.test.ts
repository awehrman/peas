import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import type { ParserSegment } from "../../../../workers/ingredient/types";
import {
  IngredientService,
  IngredientServiceContainer,
} from "../../../ingredient";

describe("IngredientService (private) extractSegmentsFromParsedResult", () => {
  let service: IngredientService;

  beforeEach(() => {
    const logger: { log: Mock } = { log: vi.fn() };
    const container: IngredientServiceContainer = { logger };
    service = new IngredientService(container);
  });

  function callExtractSegments(parsedResult: unknown): ParserSegment[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (service as any).extractSegmentsFromParsedResult(parsedResult);
  }

  it("returns [] if values is missing", () => {
    expect(callExtractSegments({})).toEqual([]);
    expect(callExtractSegments({ values: undefined })).toEqual([]);
    expect(callExtractSegments({ values: null })).toEqual([]);
    expect(callExtractSegments({ values: 123 })).toEqual([]);
    expect(callExtractSegments({ values: [] })).toEqual([]);
  });

  it("filters out segments with no value or values", () => {
    const result = callExtractSegments({
      values: [
        {},
        { rule: "ingredient" },
        { type: "ingredient" },
        { rule: "ingredient", value: "" },
      ],
    });
    expect(result).toEqual([]);
  });

  it("handles segments with values as array", () => {
    const result = callExtractSegments({
      values: [
        { rule: "ingredient", type: "ingredient", values: ["sugar", "flour"] },
      ],
    });
    expect(result).toEqual([
      {
        index: 0,
        rule: "ingredient",
        type: "ingredient",
        value: "sugar flour",
        processingTime: 0,
      },
    ]);
  });

  it("handles segments with values as string", () => {
    const result = callExtractSegments({
      values: [{ rule: "ingredient", type: "ingredient", values: "salt" }],
    });
    expect(result).toEqual([
      {
        index: 0,
        rule: "ingredient",
        type: "ingredient",
        value: "salt",
        processingTime: 0,
      },
    ]);
  });

  it("handles segments with value as string or number", () => {
    const result = callExtractSegments({
      values: [
        { rule: "amount", type: "amount", value: "2" },
        { rule: "amount", type: "amount", value: 5 },
      ],
    });
    expect(result).toEqual([
      {
        index: 0,
        rule: "amount",
        type: "amount",
        value: "2",
        processingTime: 0,
      },
      {
        index: 1,
        rule: "amount",
        type: "amount",
        value: "5",
        processingTime: 0,
      },
    ]);
  });

  it("defaults rule and type, trims value, and filters out empty value", () => {
    const result = callExtractSegments({
      values: [{ value: "  pepper  " }, { value: "   " }],
    });
    expect(result).toEqual([
      {
        index: 0,
        rule: "",
        type: "ingredient",
        value: "pepper",
        processingTime: 0,
      },
    ]);
  });
});

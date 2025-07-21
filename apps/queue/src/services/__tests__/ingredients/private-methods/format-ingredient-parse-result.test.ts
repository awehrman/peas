import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import type { ParserSegment } from "../../../../workers/ingredient/types";
import { IngredientSegmentType } from "../../../../workers/ingredient/types";
import {
  IngredientService,
  IngredientServiceContainer,
} from "../../../ingredient";

describe("IngredientService (private) formatIngredientParseResult", () => {
  let service: IngredientService;

  beforeEach(() => {
    const logger: { log: Mock } = { log: vi.fn() };
    const container: IngredientServiceContainer = { logger };
    service = new IngredientService(container);
  });

  function callFormatResult(
    segments: ParserSegment[],
    hasValidSegments: boolean,
    errorMessage?: string
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (service as any).formatIngredientParseResult(
      segments,
      hasValidSegments,
      errorMessage
    );
  }

  it("returns correct result for valid segments", () => {
    const segments: ParserSegment[] = [
      {
        index: 0,
        rule: "ingredient",
        type: IngredientSegmentType.Ingredient,
        value: "sugar",
        processingTime: 5,
      },
      {
        index: 1,
        rule: "amount",
        type: IngredientSegmentType.Amount,
        value: "2",
        processingTime: 3,
      },
    ];
    const result = callFormatResult(segments, true);
    expect(result.success).toBe(true);
    expect(result.parseStatus).toBe("CORRECT");
    expect(result.segments).toEqual([
      {
        index: 0,
        rule: "ingredient",
        type: IngredientSegmentType.Ingredient,
        value: "sugar",
        processingTime: 5,
      },
      {
        index: 1,
        rule: "amount",
        type: IngredientSegmentType.Amount,
        value: "2",
        processingTime: 3,
      },
    ]);
    expect(result.processingTime).toBe(0);
    expect(result).not.toHaveProperty("errorMessage");
  });

  it("returns correct result for invalid segments with custom error message", () => {
    const segments: ParserSegment[] = [
      {
        index: 0,
        rule: "ingredient",
        type: IngredientSegmentType.Ingredient,
        value: "",
        processingTime: 0,
      },
    ];
    const result = callFormatResult(segments, false, "Custom error");
    expect(result.success).toBe(false);
    expect(result.parseStatus).toBe("ERROR");
    expect(result.segments).toEqual([
      {
        index: 0,
        rule: "ingredient",
        type: IngredientSegmentType.Ingredient,
        value: "",
        processingTime: 0,
      },
    ]);
    expect(result.processingTime).toBe(0);
    expect(result.errorMessage).toBe("Custom error");
  });

  it("returns correct result for invalid segments with default error message", () => {
    const segments: ParserSegment[] = [];
    const result = callFormatResult(segments, false);
    expect(result.success).toBe(false);
    expect(result.parseStatus).toBe("ERROR");
    expect(result.segments).toEqual([]);
    expect(result.processingTime).toBe(0);
    expect(result.errorMessage).toBe("No valid ingredient segments found");
  });

  it("normalizes fields in segments", () => {
    const segments: ParserSegment[] = [
      {
        index: 0,
        rule: "",
        type: IngredientSegmentType.Ingredient,
        value: "  salt  ",
        processingTime: 0,
      },
    ];
    const result = callFormatResult(segments, true);
    expect(result.segments[0]).toEqual({
      index: 0,
      rule: "",
      type: IngredientSegmentType.Ingredient,
      value: "salt",
      processingTime: 0,
    });
  });
});

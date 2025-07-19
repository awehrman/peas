import { describe, it, expect, beforeEach, vi } from "vitest";
import { TrackPatternAction, TrackPatternInput } from "../track-pattern";

describe("TrackPatternAction", () => {
  let trackPatternAction: TrackPatternAction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDeps: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPatternTracker: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock pattern tracker
    mockPatternTracker = {
      trackPattern: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock dependencies that match IngredientWorkerDependencies
    mockDeps = {
      database: {
        patternTracker: mockPatternTracker,
      },
      logger: {
        log: vi.fn(),
      },
    };

    trackPatternAction = new TrackPatternAction();
  });

  describe("execute", () => {
    const mockInput: TrackPatternInput = {
      noteId: "test-note-123",
      ingredientLineId: "test-line-456",
      reference: "2 cups kosher salt",
      parsedSegments: [
        {
          index: 0,
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
          type: "amount",
          value: "2",
        },
        {
          index: 1,
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #8_unit",
          type: "unit",
          value: "cups",
        },
        {
          index: 2,
          rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
          type: "ingredient",
          value: "kosher salt",
        },
      ],
    };

    it("should track pattern successfully", async () => {
      const result = await trackPatternAction.execute(mockInput, mockDeps);

      // Should return the input unchanged
      expect(result).toEqual(mockInput);

      // Should call pattern tracker with correct parameters (PatternRule format)
      expect(mockPatternTracker.trackPattern).toHaveBeenCalledWith(
        [
          {
            rule: mockInput.parsedSegments![0]!.rule,
            ruleNumber: 0,
          },
          {
            rule: mockInput.parsedSegments![1]!.rule,
            ruleNumber: 1,
          },
          {
            rule: mockInput.parsedSegments![2]!.rule,
            ruleNumber: 2,
          },
        ],
        mockInput.reference
      );
    });

    it("should handle pattern tracker errors gracefully", async () => {
      mockPatternTracker.trackPattern.mockRejectedValue(
        new Error("Tracking failed")
      );

      const result = await trackPatternAction.execute(mockInput, mockDeps);

      // Should still return the input unchanged
      expect(result).toEqual(mockInput);

      // Should log the error (but it's now in a .catch() block, so we need to wait)
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Error tracking pattern: Tracking failed"
      );
    });

    it("should handle action execution errors gracefully", async () => {
      mockPatternTracker.trackPattern.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await trackPatternAction.execute(mockInput, mockDeps);

      // Should still return the input unchanged
      expect(result).toEqual(mockInput);

      // Should log the error
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Error in track pattern action: Unexpected error"
      );
    });

    it("should work with empty segments", async () => {
      const inputWithEmptySegments: TrackPatternInput = {
        ...mockInput,
        parsedSegments: [],
      };

      const result = await trackPatternAction.execute(
        inputWithEmptySegments,
        mockDeps
      );

      expect(result).toEqual(inputWithEmptySegments);
      // Empty array should be skipped and trackPattern should not be called
      expect(mockPatternTracker.trackPattern).not.toHaveBeenCalled();
    });

    it("should work with single segment", async () => {
      const inputWithSingleSegment: TrackPatternInput = {
        ...mockInput,
        parsedSegments: [mockInput.parsedSegments![0]!],
      };

      const result = await trackPatternAction.execute(
        inputWithSingleSegment,
        mockDeps
      );

      expect(result).toEqual(inputWithSingleSegment);
      expect(mockPatternTracker.trackPattern).toHaveBeenCalledWith(
        [
          {
            rule: mockInput.parsedSegments![0]!.rule,
            ruleNumber: 0,
          },
        ],
        mockInput.reference
      );
    });

    it("should handle undefined parsedSegments gracefully", async () => {
      const inputWithUndefinedSegments: TrackPatternInput = {
        ...mockInput,
        parsedSegments: undefined,
      };

      const result = await trackPatternAction.execute(
        inputWithUndefinedSegments,
        mockDeps
      );

      expect(result).toEqual(inputWithUndefinedSegments);
      expect(mockPatternTracker.trackPattern).not.toHaveBeenCalled();
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] No parsed segments to track, skipping pattern tracking"
      );
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(trackPatternAction.name).toBe("track_pattern");
    });
  });
});

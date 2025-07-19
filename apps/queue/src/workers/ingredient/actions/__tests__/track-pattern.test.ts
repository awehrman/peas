import { describe, it, expect, beforeEach, vi } from "vitest";
import { TrackPatternAction, TrackPatternInput } from "../track-pattern";

describe("TrackPatternAction", () => {
  let trackPatternAction: TrackPatternAction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDbOps: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPatternTracker: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock pattern tracker
    mockPatternTracker = {
      trackPattern: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock database operations
    mockDbOps = {
      patternTracker: mockPatternTracker,
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
      const result = await trackPatternAction.execute(mockInput, mockDbOps);

      // Should return the input unchanged
      expect(result).toEqual(mockInput);

      // Should call pattern tracker with correct parameters
      expect(mockPatternTracker.trackPattern).toHaveBeenCalledWith(
        [
          {
            rule: mockInput.parsedSegments![0]!.rule,
            type: mockInput.parsedSegments![0]!.type,
            value: mockInput.parsedSegments![0]!.value,
          },
          {
            rule: mockInput.parsedSegments![1]!.rule,
            type: mockInput.parsedSegments![1]!.type,
            value: mockInput.parsedSegments![1]!.value,
          },
          {
            rule: mockInput.parsedSegments![2]!.rule,
            type: mockInput.parsedSegments![2]!.type,
            value: mockInput.parsedSegments![2]!.value,
          },
        ],
        mockInput.reference
      );
    });

    it("should handle pattern tracker errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockPatternTracker.trackPattern.mockRejectedValue(
        new Error("Tracking failed")
      );

      const result = await trackPatternAction.execute(mockInput, mockDbOps);

      // Should still return the input unchanged
      expect(result).toEqual(mockInput);

      // Should log the error
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Error tracking pattern:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should handle action execution errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockPatternTracker.trackPattern.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await trackPatternAction.execute(mockInput, mockDbOps);

      // Should still return the input unchanged
      expect(result).toEqual(mockInput);

      // Should log the error
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Error in track pattern action:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should work with empty segments", async () => {
      const inputWithEmptySegments: TrackPatternInput = {
        ...mockInput,
        parsedSegments: [],
      };

      const result = await trackPatternAction.execute(
        inputWithEmptySegments,
        mockDbOps
      );

      expect(result).toEqual(inputWithEmptySegments);
      // Empty array should still call trackPattern with empty array
      expect(mockPatternTracker.trackPattern).toHaveBeenCalledWith(
        [],
        mockInput.reference
      );
    });

    it("should work with single segment", async () => {
      const inputWithSingleSegment: TrackPatternInput = {
        ...mockInput,
        parsedSegments: [mockInput.parsedSegments![0]!],
      };

      const result = await trackPatternAction.execute(
        inputWithSingleSegment,
        mockDbOps
      );

      expect(result).toEqual(inputWithSingleSegment);
      expect(mockPatternTracker.trackPattern).toHaveBeenCalledWith(
        [
          {
            rule: mockInput.parsedSegments![0]!.rule,
            type: mockInput.parsedSegments![0]!.type,
            value: mockInput.parsedSegments![0]!.value,
          },
        ],
        mockInput.reference
      );
    });

    it("should handle undefined parsedSegments gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const inputWithUndefinedSegments: TrackPatternInput = {
        ...mockInput,
        parsedSegments: undefined,
      };

      const result = await trackPatternAction.execute(
        inputWithUndefinedSegments,
        mockDbOps
      );

      expect(result).toEqual(inputWithUndefinedSegments);
      expect(mockPatternTracker.trackPattern).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TRACK_PATTERN] No parsed segments to track, skipping pattern tracking"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(trackPatternAction.name).toBe("track_pattern");
    });
  });
});

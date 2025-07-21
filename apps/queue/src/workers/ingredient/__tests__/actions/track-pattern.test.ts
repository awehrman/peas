import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrackPatternAction } from "../../actions/track-pattern";
import type {
  IngredientWorkerDependencies,
  TrackPatternInput,
} from "../../types";

function createDeps(
  overrides: Partial<IngredientWorkerDependencies> = {}
): IngredientWorkerDependencies {
  return {
    database: {
      prisma:
        {} as unknown as IngredientWorkerDependencies["database"]["prisma"],
      patternTracker:
        {} as unknown as IngredientWorkerDependencies["database"]["patternTracker"],
      updateNoteCompletionTracker: vi.fn(),
      incrementNoteCompletionTracker: vi.fn(),
      checkNoteCompletion: vi.fn(),
    } as IngredientWorkerDependencies["database"],
    parseIngredient: vi.fn().mockResolvedValue({
      success: true,
      parseStatus: "CORRECT",
      segments: [],
      processingTime: 100,
    }),
    categorizationQueue: {
      add: vi.fn().mockResolvedValue(undefined),
    } as unknown as IngredientWorkerDependencies["categorizationQueue"],
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    logger: { log: vi.fn() },
    ErrorHandler: {
      withErrorHandling: vi.fn(async (op) => op()),
    },
    ...overrides,
  };
}

function createInput(
  overrides: Partial<TrackPatternInput> = {}
): TrackPatternInput {
  return {
    noteId: "note-1",
    ingredientLineId: "line-1",
    reference: "2 cups flour",
    parsedSegments: [
      {
        index: 0,
        rule: "amount",
        type: "amount",
        value: "2",
      },
      {
        index: 1,
        rule: "unit",
        type: "unit",
        value: "cups",
      },
      {
        index: 2,
        rule: "ingredient",
        type: "ingredient",
        value: "flour",
      },
    ],
    importId: "import-1",
    currentIngredientIndex: 3,
    totalIngredients: 5,
    ...overrides,
  };
}

describe("TrackPatternAction", () => {
  let action: TrackPatternAction;
  let deps: IngredientWorkerDependencies;
  let input: TrackPatternInput;

  beforeEach(() => {
    action = new TrackPatternAction();
    deps = createDeps();
    input = createInput();
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("successfully tracks pattern with segments", async () => {
      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] Starting track pattern action for note note-1"
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[TRACK_PATTERN] Input data: noteId=note-1, ingredientLineId=line-1, reference="2 cups flour", segmentsCount=3, importId=import-1'
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("[TRACK_PATTERN] Found 3 segments to track")
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("[TRACK_PATTERN] Converted to pattern rules:")
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] Calling patternTracker.trackPattern..."
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] Pattern tracking initiated (non-blocking)"
        )
      );

      // Verify pattern rules were converted correctly
      const patternRules = [
        { rule: "amount", ruleNumber: 0 },
        { rule: "unit", ruleNumber: 1 },
        { rule: "ingredient", ruleNumber: 2 },
      ];

      expect(deps.database.patternTracker.trackPattern).toHaveBeenCalledWith(
        patternRules,
        "2 cups flour"
      );
    });

    it("handles missing parsed segments", async () => {
      input = createInput({ parsedSegments: undefined });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] No parsed segments to track, skipping pattern tracking"
        )
      );

      // Verify pattern tracker was not called
      expect(deps.database.patternTracker.trackPattern).not.toHaveBeenCalled();
    });

    it("handles empty parsed segments array", async () => {
      input = createInput({ parsedSegments: [] });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] Empty parsed segments array, skipping pattern tracking"
        )
      );

      // Verify pattern tracker was not called
      expect(deps.database.patternTracker.trackPattern).not.toHaveBeenCalled();
    });

    it("handles missing patternTracker", async () => {
      const mockPatternTracker = {
        trackPattern: vi.fn().mockResolvedValue(undefined),
      } as unknown as IngredientWorkerDependencies["database"]["patternTracker"];

      deps.database.patternTracker = mockPatternTracker;

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] PatternTracker not available, skipping"
        )
      );
    });

    it("handles patternTracker errors", async () => {
      const error = new Error("Database connection failed");
      deps.database.patternTracker.trackPattern = vi
        .fn()
        .mockRejectedValue(error);

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify pattern tracker was called
      expect(deps.database.patternTracker.trackPattern).toHaveBeenCalled();

      // Wait for the async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify error logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] Error tracking pattern: Database connection failed"
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[TRACK_PATTERN] Error details: noteId=note-1, ingredientLineId=line-1, reference="2 cups flour"'
        )
      );
    });

    it("handles non-Error exceptions in patternTracker", async () => {
      deps.database.patternTracker.trackPattern = vi
        .fn()
        .mockRejectedValue("String error");

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Wait for the async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify error logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] Error tracking pattern: undefined"
        )
      );
    });

    it("handles execution errors gracefully", async () => {
      const error = new Error("Unexpected error");
      deps.database.patternTracker.trackPattern = vi
        .fn()
        .mockImplementation(() => {
          throw error;
        });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify error logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] Error in track pattern action: Unexpected error"
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[TRACK_PATTERN] Error details: noteId=note-1, ingredientLineId=line-1, reference="2 cups flour"'
        )
      );
    });

    it("handles non-Error exceptions in execution", async () => {
      deps.database.patternTracker.trackPattern = vi
        .fn()
        .mockImplementation(() => {
          throw "String error";
        });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify error logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[TRACK_PATTERN] Error in track pattern action: String error"
        )
      );
    });

    it("handles missing logger gracefully", async () => {
      deps.logger =
        undefined as unknown as IngredientWorkerDependencies["logger"];

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Should not throw when logger is missing
      expect(deps.database.patternTracker.trackPattern).toHaveBeenCalled();
    });

    it("handles complex input with all fields", async () => {
      input = createInput({
        noteId: "note-456",
        ingredientLineId: "line-123",
        reference: "1/2 cup olive oil, extra virgin",
        parsedSegments: [
          {
            index: 0,
            rule: "fraction",
            type: "amount",
            value: "1/2",
          },
          {
            index: 1,
            rule: "unit",
            type: "unit",
            value: "cup",
          },
          {
            index: 2,
            rule: "ingredient",
            type: "ingredient",
            value: "olive oil",
          },
          {
            index: 3,
            rule: "modifier",
            type: "modifier",
            value: "extra virgin",
          },
        ],
        importId: "import-789",
        currentIngredientIndex: 10,
        totalIngredients: 15,
      });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify pattern rules were converted correctly
      const patternRules = [
        { rule: "fraction", ruleNumber: 0 },
        { rule: "unit", ruleNumber: 1 },
        { rule: "ingredient", ruleNumber: 2 },
        { rule: "modifier", ruleNumber: 3 },
      ];

      expect(deps.database.patternTracker.trackPattern).toHaveBeenCalledWith(
        patternRules,
        "1/2 cup olive oil, extra virgin"
      );
    });

    it("handles input with missing optional fields", async () => {
      input = createInput({
        importId: undefined,
        currentIngredientIndex: undefined,
        totalIngredients: undefined,
      });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify logging includes undefined values
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[TRACK_PATTERN] Input data: noteId=note-1, ingredientLineId=line-1, reference="2 cups flour", segmentsCount=3, importId=undefined'
        )
      );
    });

    it("handles single segment pattern", async () => {
      input = createInput({
        parsedSegments: [
          {
            index: 0,
            rule: "ingredient",
            type: "ingredient",
            value: "salt",
          },
        ],
      });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify pattern rules were converted correctly
      const patternRules = [{ rule: "ingredient", ruleNumber: 0 }];

      expect(deps.database.patternTracker.trackPattern).toHaveBeenCalledWith(
        patternRules,
        "2 cups flour"
      );
    });

    it("handles segments with non-sequential indices", async () => {
      input = createInput({
        parsedSegments: [
          {
            index: 5,
            rule: "amount",
            type: "amount",
            value: "2",
          },
          {
            index: 10,
            rule: "unit",
            type: "unit",
            value: "cups",
          },
          {
            index: 15,
            rule: "ingredient",
            type: "ingredient",
            value: "flour",
          },
        ],
      });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify pattern rules were converted correctly with original indices
      const patternRules = [
        { rule: "amount", ruleNumber: 5 },
        { rule: "unit", ruleNumber: 10 },
        { rule: "ingredient", ruleNumber: 15 },
      ];

      expect(deps.database.patternTracker.trackPattern).toHaveBeenCalledWith(
        patternRules,
        "2 cups flour"
      );
    });

    it("handles empty reference string", async () => {
      input = createInput({ reference: "" });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify pattern tracker was called with empty reference
      expect(deps.database.patternTracker.trackPattern).toHaveBeenCalledWith(
        expect.any(Array),
        ""
      );
    });

    it("handles very long reference string", async () => {
      const longReference =
        "A very long ingredient reference that contains many words and should be handled properly by the pattern tracker without any issues";
      input = createInput({ reference: longReference });

      const result = await action.execute(input, deps);

      expect(result).toEqual(input);

      // Verify pattern tracker was called with long reference
      expect(deps.database.patternTracker.trackPattern).toHaveBeenCalledWith(
        expect.any(Array),
        longReference
      );
    });
  });
});

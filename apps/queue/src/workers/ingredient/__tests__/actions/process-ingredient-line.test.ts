import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessIngredientLineAction } from "../../actions/process-ingredient-line";
import type {
  IngredientWorkerDependencies,
  ParsedIngredientResult,
  ProcessIngredientLineInput,
} from "../../types";

interface TestContext {
  jobId: string;
  retryCount: number;
  queueName: string;
  noteId: string;
  operation: string;
  startTime: number;
  workerName: string;
  attemptNumber: number;
}

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

describe("ProcessIngredientLineAction", () => {
  let action: ProcessIngredientLineAction;
  let deps: IngredientWorkerDependencies;
  let input: ProcessIngredientLineInput;
  let context: TestContext;

  beforeEach(() => {
    action = new ProcessIngredientLineAction();
    deps = createDeps();
    input = {
      noteId: "note-1",
      ingredientLineId: "line-1",
      reference: "2 cups flour",
      blockIndex: 0,
      lineIndex: 0,
      importId: "import-1",
      currentIngredientIndex: 1,
      totalIngredients: 2,
    };
    context = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test",
      noteId: "note-1",
      operation: "test",
      startTime: Date.now(),
      workerName: "worker",
      attemptNumber: 1,
    };
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("successfully processes ingredient line with valid input", async () => {
      const parseResult: ParsedIngredientResult = {
        success: true,
        parseStatus: "CORRECT",
        segments: [
          {
            index: 0,
            rule: "amount",
            type: "amount",
            value: "2",
            processingTime: 50,
          },
          {
            index: 1,
            rule: "unit",
            type: "unit",
            value: "cups",
            processingTime: 30,
          },
          {
            index: 2,
            rule: "ingredient",
            type: "ingredient",
            value: "flour",
            processingTime: 20,
          },
        ],
        processingTime: 100,
      };

      deps.parseIngredient = vi.fn().mockResolvedValue(parseResult);

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        noteId: "note-1",
        ingredientLineId: "line-1",
        reference: "2 cups flour",
        blockIndex: 0,
        lineIndex: 0,
        importId: "import-1",
        currentIngredientIndex: 1,
        totalIngredients: 2,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "amount",
            type: "amount",
            value: "2",
            processingTime: 100,
          },
          {
            index: 1,
            rule: "unit",
            type: "unit",
            value: "cups",
            processingTime: 100,
          },
          {
            index: 2,
            rule: "ingredient",
            type: "ingredient",
            value: "flour",
            processingTime: 100,
          },
        ],
        processingTime: 100,
      });

      expect(deps.parseIngredient).toHaveBeenCalledWith("2 cups flour");
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Processing ingredient line for note note-1")
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[PROCESS_INGREDIENT_LINE] Parser result for "2 cups flour"'
        )
      );
    });

    it("handles parsing error and broadcasts error", async () => {
      const parseResult: ParsedIngredientResult = {
        success: false,
        parseStatus: "ERROR",
        segments: [],
        processingTime: 50,
        errorMessage: "Invalid ingredient format",
      };

      deps.parseIngredient = vi.fn().mockResolvedValue(parseResult);
      deps.addStatusEventAndBroadcast = vi.fn().mockResolvedValue(undefined);

      const result = await action.execute(input, deps, context);

      expect(result.success).toBe(false);
      expect(result.parseStatus).toBe("ERROR");
      expect(result.errorMessage).toBe("Invalid ingredient format");
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "FAILED",
        message: "❌ Invalid ingredient format",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          errorType: "PARSING_ERROR",
          errorMessage: "Invalid ingredient format",
          lineId: "line-1",
          reference: "2 cups flour",
        },
      });
    });

    it("handles parsing error without error message", async () => {
      const parseResult: ParsedIngredientResult = {
        success: false,
        parseStatus: "ERROR",
        segments: [],
        processingTime: 50,
      };

      deps.parseIngredient = vi.fn().mockResolvedValue(parseResult);
      deps.addStatusEventAndBroadcast = vi.fn().mockResolvedValue(undefined);

      const result = await action.execute(input, deps, context);

      expect(result.success).toBe(false);
      expect(result.parseStatus).toBe("ERROR");
      expect(result.errorMessage).toBeUndefined();
      // Should not broadcast when there's no error message
      expect(deps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("handles processing error and broadcasts error", async () => {
      const error = new Error("Processing failed");
      deps.parseIngredient = vi.fn().mockRejectedValue(error);
      deps.addStatusEventAndBroadcast = vi.fn().mockResolvedValue(undefined);

      const result = await action.execute(input, deps, context);

      expect(result.success).toBe(false);
      expect(result.parseStatus).toBe("ERROR");
      expect(result.errorMessage).toBe("Processing failed");
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "FAILED",
        message: "❌ Processing error: Processing failed",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          errorType: "PARSING_ERROR",
          errorMessage: "Processing error: Processing failed",
          lineId: "line-1",
          reference: "2 cups flour",
        },
      });
    });

    it("handles processing error with non-Error object", async () => {
      const error = "String error";
      deps.parseIngredient = vi.fn().mockRejectedValue(error);
      deps.addStatusEventAndBroadcast = vi.fn().mockResolvedValue(undefined);

      const result = await action.execute(input, deps, context);

      expect(result.success).toBe(false);
      expect(result.parseStatus).toBe("ERROR");
      expect(result.errorMessage).toBeUndefined();
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "FAILED",
        message: "❌ Processing error: undefined",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          errorType: "PARSING_ERROR",
          errorMessage: "Processing error: undefined",
          lineId: "line-1",
          reference: "2 cups flour",
        },
      });
    });

    it("logs processing start with logger", async () => {
      const parseResult: ParsedIngredientResult = {
        success: true,
        parseStatus: "CORRECT",
        segments: [],
        processingTime: 100,
      };

      deps.parseIngredient = vi.fn().mockResolvedValue(parseResult);

      await action.execute(input, deps, context);

      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Processing ingredient line for note note-1")
      );
    });

    it("logs processing start without logger (fallback to console)", async () => {
      const parseResult: ParsedIngredientResult = {
        success: true,
        parseStatus: "CORRECT",
        segments: [],
        processingTime: 100,
      };

      deps.parseIngredient = vi.fn().mockResolvedValue(parseResult);
      deps.logger =
        undefined as unknown as IngredientWorkerDependencies["logger"];

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await action.execute(input, deps, context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Processing ingredient line for note note-1"),
        expect.objectContaining({
          ingredientLineId: "line-1",
          reference: "2 cups flour",
          blockIndex: 0,
          lineIndex: 0,
        })
      );

      consoleSpy.mockRestore();
    });

    it("handles empty segments in parse result", async () => {
      const parseResult: ParsedIngredientResult = {
        success: true,
        parseStatus: "CORRECT",
        segments: [],
        processingTime: 100,
      };

      deps.parseIngredient = vi.fn().mockResolvedValue(parseResult);

      const result = await action.execute(input, deps, context);

      expect(result.parsedSegments).toEqual([]);
    });

    it("converts parser segments correctly", async () => {
      const parseResult: ParsedIngredientResult = {
        success: true,
        parseStatus: "CORRECT",
        segments: [
          {
            index: 0,
            rule: "amount",
            type: "amount",
            value: "2",
            processingTime: 50,
          },
        ],
        processingTime: 100,
      };

      deps.parseIngredient = vi.fn().mockResolvedValue(parseResult);

      const result = await action.execute(input, deps, context);

      expect(result.parsedSegments).toEqual([
        {
          index: 0,
          rule: "amount",
          type: "amount",
          value: "2",
          processingTime: 100,
        },
      ]);
    });

    it("handles segments without processing time", async () => {
      const parseResult: ParsedIngredientResult = {
        success: true,
        parseStatus: "CORRECT",
        segments: [
          {
            index: 0,
            rule: "amount",
            type: "amount",
            value: "2",
          },
        ],
        processingTime: 100,
      };

      deps.parseIngredient = vi.fn().mockResolvedValue(parseResult);

      const result = await action.execute(input, deps, context);

      expect(result.parsedSegments).toEqual([
        {
          index: 0,
          rule: "amount",
          type: "amount",
          value: "2",
          processingTime: 100,
        },
      ]);
    });
  });
});

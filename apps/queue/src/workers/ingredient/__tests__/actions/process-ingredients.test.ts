import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessIngredientsAction } from "../../actions/process-ingredients";
import type {
  IngredientWorkerDependencies,
  ProcessIngredientsInput,
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

// Mock the DatabaseOperations class
const mockDatabaseOperations = {
  updateParsedIngredientLine: vi.fn().mockResolvedValue(undefined),
  replaceParsedSegments: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../../shared/database-operations", () => ({
  DatabaseOperations: vi.fn().mockImplementation(() => mockDatabaseOperations),
}));

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

describe("ProcessIngredientsAction", () => {
  let action: ProcessIngredientsAction;
  let deps: IngredientWorkerDependencies;
  let input: ProcessIngredientsInput;
  let context: TestContext;

  beforeEach(() => {
    action = new ProcessIngredientsAction();
    deps = createDeps();
    input = {
      noteId: "note-1",
      importId: "import-1",
      ingredientLines: [
        {
          id: "line-1",
          reference: "2 cups flour",
          blockIndex: 0,
          lineIndex: 0,
        },
        {
          id: "line-2",
          reference: "1 cup sugar",
          blockIndex: 0,
          lineIndex: 1,
        },
        {
          id: "line-3",
          reference: "3 eggs",
          blockIndex: 0,
          lineIndex: 2,
        },
      ],
    };
    context = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test",
      noteId: "note-1",
      operation: "process-ingredients",
      startTime: Date.now(),
      workerName: "worker",
      attemptNumber: 1,
    };
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("successfully processes all ingredient lines", async () => {
      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: true,
        processedCount: 3,
        totalCount: 3,
        errors: [],
      });

      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PROCESS_INGREDIENTS] Processing 3 ingredient lines for note note-1"
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PROCESS_INGREDIENTS] Completed processing 3/3 ingredient lines for note note-1"
        )
      );

      // Verify parsing was called for each line
      expect(deps.parseIngredient).toHaveBeenCalledTimes(3);
      expect(deps.parseIngredient).toHaveBeenCalledWith("2 cups flour");
      expect(deps.parseIngredient).toHaveBeenCalledWith("1 cup sugar");
      expect(deps.parseIngredient).toHaveBeenCalledWith("3 eggs");

      // Verify database operations were called
      expect(
        mockDatabaseOperations.updateParsedIngredientLine
      ).toHaveBeenCalledTimes(3);
      expect(
        mockDatabaseOperations.replaceParsedSegments
      ).toHaveBeenCalledTimes(3);

      // Verify status broadcasting
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "PROCESSING",
        message: "Processed 3/3 ingredient lines",
        currentCount: 3,
        totalCount: 3,
        context: "process-ingredients",
      });

      // Verify categorization was scheduled
      expect(deps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "note-1",
          importId: "import-1",
          title: "Recipe with 3 ingredients",
          content: "",
        }
      );

      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "PROCESSING",
        message: "Scheduled categorization after ingredient processing",
        context: "process-ingredients",
      });
    });

    it("handles ingredient lines with missing ID", async () => {
      input.ingredientLines = [
        {
          id: "",
          reference: "2 cups flour",
          blockIndex: 0,
          lineIndex: 0,
        },
        {
          id: "line-2",
          reference: "1 cup sugar",
          blockIndex: 0,
          lineIndex: 1,
        },
      ];

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: true,
        processedCount: 1,
        totalCount: 2,
        errors: [
          {
            lineId: "unknown",
            error: "Line ID is missing",
          },
        ],
      });

      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PROCESS_INGREDIENTS] Skipping ingredient line - missing ID"
        ),
        "error"
      );

      // Only one line should be processed
      expect(deps.parseIngredient).toHaveBeenCalledTimes(1);
      expect(deps.parseIngredient).toHaveBeenCalledWith("1 cup sugar");
    });

    it("handles parsing failures", async () => {
      deps.parseIngredient = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [],
          processingTime: 100,
        })
        .mockResolvedValueOnce({
          success: false,
          parseStatus: "ERROR",
          segments: [],
          processingTime: 50,
          errorMessage: "Invalid ingredient format",
        })
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [],
          processingTime: 100,
        });

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: true,
        processedCount: 2,
        totalCount: 3,
        errors: [
          {
            lineId: "line-2",
            error: "Invalid ingredient format",
          },
        ],
      });

      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PROCESS_INGREDIENTS] Failed to parse ingredient line line-2: Invalid ingredient format"
        ),
        "error"
      );
    });

    it("handles parsing failures without error message", async () => {
      deps.parseIngredient = vi.fn().mockResolvedValue({
        success: false,
        parseStatus: "ERROR",
        segments: [],
        processingTime: 50,
      });

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 3,
        errors: [
          {
            lineId: "line-1",
            error: "Parsing failed",
          },
          {
            lineId: "line-2",
            error: "Parsing failed",
          },
          {
            lineId: "line-3",
            error: "Parsing failed",
          },
        ],
      });
    });

    it("handles processing errors during parsing", async () => {
      const error = new Error("Database connection failed");
      deps.parseIngredient = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [],
          processingTime: 100,
        })
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [],
          processingTime: 100,
        });

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: true,
        processedCount: 2,
        totalCount: 3,
        errors: [
          {
            lineId: "line-2",
            error: "Processing error: Error: Database connection failed",
          },
        ],
      });

      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PROCESS_INGREDIENTS] Error processing ingredient line line-2: Error: Database connection failed"
        ),
        "error"
      );
    });

    it("handles non-Error exceptions during parsing", async () => {
      deps.parseIngredient = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [],
          processingTime: 100,
        })
        .mockRejectedValueOnce("String error")
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [],
          processingTime: 100,
        });

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: true,
        processedCount: 2,
        totalCount: 3,
        errors: [
          {
            lineId: "line-2",
            error: "Processing error: String error",
          },
        ],
      });
    });

    it("handles empty ingredient lines array", async () => {
      input.ingredientLines = [];

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 0,
        errors: [],
      });

      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PROCESS_INGREDIENTS] Processing 0 ingredient lines for note note-1"
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PROCESS_INGREDIENTS] Completed processing 0/0 ingredient lines for note note-1"
        )
      );

      // Should not schedule categorization when no lines are processed
      expect(deps.categorizationQueue.add).not.toHaveBeenCalled();
    });

    it("handles categorization scheduling failure", async () => {
      const error = new Error("Queue connection failed");
      deps.categorizationQueue.add = vi.fn().mockRejectedValue(error);

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: true,
        processedCount: 3,
        totalCount: 3,
        errors: [],
      });

      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PROCESS_INGREDIENTS] Failed to schedule categorization for note note-1: Error: Queue connection failed"
        ),
        "error"
      );

      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "FAILED",
        message:
          "Failed to schedule categorization: Error: Queue connection failed",
        context: "process-ingredients",
      });
    });

    it("handles non-Error exceptions during categorization scheduling", async () => {
      deps.categorizationQueue.add = vi.fn().mockRejectedValue("String error");

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: true,
        processedCount: 3,
        totalCount: 3,
        errors: [],
      });

      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "FAILED",
        message: "Failed to schedule categorization: String error",
        context: "process-ingredients",
      });
    });

    it("does not schedule categorization when no lines are processed", async () => {
      deps.parseIngredient = vi.fn().mockResolvedValue({
        success: false,
        parseStatus: "ERROR",
        segments: [],
        processingTime: 50,
        errorMessage: "Invalid ingredient format",
      });

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 3,
        errors: [
          {
            lineId: "line-1",
            error: "Invalid ingredient format",
          },
          {
            lineId: "line-2",
            error: "Invalid ingredient format",
          },
          {
            lineId: "line-3",
            error: "Invalid ingredient format",
          },
        ],
      });

      // Should not schedule categorization when no lines are processed
      expect(deps.categorizationQueue.add).not.toHaveBeenCalled();
    });

    it("handles ingredient lines with segments", async () => {
      deps.parseIngredient = vi.fn().mockResolvedValue({
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
            rule: "ingredient",
            type: "ingredient",
            value: "cups",
            processingTime: 30,
          },
        ],
        processingTime: 100,
      });

      const result = await action.execute(input, deps, context);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);

      // Verify segments were saved to database
      expect(
        mockDatabaseOperations.replaceParsedSegments
      ).toHaveBeenCalledTimes(3);
      expect(mockDatabaseOperations.replaceParsedSegments).toHaveBeenCalledWith(
        "line-1",
        [
          {
            index: 0,
            rule: "amount",
            type: "amount",
            value: "2",
            processingTime: 50,
          },
          {
            index: 1,
            rule: "ingredient",
            type: "ingredient",
            value: "cups",
            processingTime: 30,
          },
        ]
      );
    });

    it("handles ingredient lines without segments", async () => {
      deps.parseIngredient = vi.fn().mockResolvedValue({
        success: true,
        parseStatus: "CORRECT",
        segments: [],
        processingTime: 100,
      });

      const result = await action.execute(input, deps, context);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);

      // Verify segments were not saved to database when empty
      expect(
        mockDatabaseOperations.replaceParsedSegments
      ).not.toHaveBeenCalled();
    });

    it("handles database operation failures", async () => {
      const dbError = new Error("Database connection failed");
      mockDatabaseOperations.updateParsedIngredientLine = vi
        .fn()
        .mockRejectedValue(dbError);

      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 3,
        errors: [
          {
            lineId: "line-1",
            error: "Processing error: Error: Database connection failed",
          },
          {
            lineId: "line-2",
            error: "Processing error: Error: Database connection failed",
          },
          {
            lineId: "line-3",
            error: "Processing error: Error: Database connection failed",
          },
        ],
      });
    });
  });
});

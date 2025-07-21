import { beforeEach, describe, expect, it, vi } from "vitest";

import { SaveIngredientLineAction } from "../../actions/save-ingredient-line";
import type {
  IngredientWorkerDependencies,
  SaveIngredientLineInput,
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
  createOrUpdateParsedIngredientLine: vi.fn().mockResolvedValue(undefined),
  replaceParsedSegments: vi.fn().mockResolvedValue(undefined),
  findOrCreateIngredient: vi.fn().mockResolvedValue({
    id: "ingredient-1",
    name: "flour",
    isNew: false,
  }),
  createIngredientReference: vi.fn().mockResolvedValue(undefined),
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

describe("SaveIngredientLineAction", () => {
  let action: SaveIngredientLineAction;
  let deps: IngredientWorkerDependencies;
  let input: SaveIngredientLineInput;
  let context: TestContext;

  beforeEach(() => {
    action = new SaveIngredientLineAction();
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
      success: true,
      parseStatus: "CORRECT",
      parsedSegments: [
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
    it("successfully saves ingredient line with valid input", async () => {
      const result = await action.execute(input, deps, context);

      expect(result).toEqual({
        noteId: "note-1",
        ingredientLineId: "line-1",
        reference: "2 cups flour",
        blockIndex: 0,
        lineIndex: 0,
        parsedSegments: [
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
        importId: "import-1",
        currentIngredientIndex: 1,
        totalIngredients: 2,
        success: true,
        segmentsSaved: 3,
        parseStatus: "CORRECT",
      });

      expect(
        mockDatabaseOperations.createOrUpdateParsedIngredientLine
      ).toHaveBeenCalledWith("line-1", {
        blockIndex: 0,
        lineIndex: 0,
        reference: "2 cups flour",
        noteId: "note-1",
        parseStatus: "CORRECT",
        parsedAt: expect.any(Date),
      });

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
        ]
      );

      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SAVE_INGREDIENT_LINE] Saving parsed segments for note note-1"
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SAVE_INGREDIENT_LINE] Creating/updating ParsedIngredientLine"
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SAVE_INGREDIENT_LINE] Successfully saved 3 parsed segments"
        )
      );
    });

    it("tracks ingredients when parsing is successful", async () => {
      const result = await action.execute(input, deps, context);

      expect(result.segmentsSaved).toBe(3);
      expect(
        mockDatabaseOperations.findOrCreateIngredient
      ).toHaveBeenCalledWith("flour", "2 cups flour");
      expect(
        mockDatabaseOperations.createIngredientReference
      ).toHaveBeenCalledWith({
        ingredientId: "ingredient-1",
        parsedLineId: "line-1",
        segmentIndex: 2,
        reference: "2 cups flour",
        noteId: "note-1",
        context: "main_ingredient",
      });
    });

    it("does not track ingredients when parsing failed", async () => {
      input.success = false;
      input.parsedSegments = [];

      const result = await action.execute(input, deps, context);

      expect(result.segmentsSaved).toBe(0);
      expect(
        mockDatabaseOperations.findOrCreateIngredient
      ).not.toHaveBeenCalled();
    });

    it("does not track ingredients when no segments", async () => {
      input.parsedSegments = [];

      const result = await action.execute(input, deps, context);

      expect(result.segmentsSaved).toBe(0);
      expect(
        mockDatabaseOperations.findOrCreateIngredient
      ).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      // Reset the mock to avoid interference from previous tests
      vi.clearAllMocks();
      mockDatabaseOperations.createOrUpdateParsedIngredientLine = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));

      await expect(action.execute(input, deps, context)).rejects.toThrow(
        "Failed to save ingredient line: Database save failed: Error: Database error"
      );
    });

    it("handles non-Error exceptions", async () => {
      // Reset the mock to avoid interference from previous tests
      vi.clearAllMocks();
      mockDatabaseOperations.createOrUpdateParsedIngredientLine = vi
        .fn()
        .mockRejectedValue("String error");

      await expect(action.execute(input, deps, context)).rejects.toThrow(
        "Failed to save ingredient line: Database save failed: String error"
      );
    });

    it("validates required ingredientLineId", async () => {
      input.ingredientLineId = "";

      await expect(action.execute(input, deps, context)).rejects.toThrow(
        "ingredientLineId is required for SaveIngredientLineAction"
      );
    });

    it("validates required noteId", async () => {
      input.noteId = "";

      await expect(action.execute(input, deps, context)).rejects.toThrow(
        "noteId is required for SaveIngredientLineAction"
      );
    });

    it("handles missing logger gracefully", async () => {
      deps.logger =
        undefined as unknown as IngredientWorkerDependencies["logger"];

      // Reset the mock to avoid interference from previous tests
      vi.clearAllMocks();
      mockDatabaseOperations.createOrUpdateParsedIngredientLine = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDatabaseOperations.replaceParsedSegments = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDatabaseOperations.findOrCreateIngredient = vi
        .fn()
        .mockResolvedValue({
          id: "ingredient-1",
          name: "flour",
          isNew: false,
        });
      mockDatabaseOperations.createIngredientReference = vi
        .fn()
        .mockResolvedValue(undefined);

      const result = await action.execute(input, deps, context);

      expect(result.segmentsSaved).toBe(3);
      // Should not throw when logger is missing
    });

    it("handles segments without processing time", async () => {
      input.parsedSegments = [
        {
          index: 0,
          rule: "amount",
          type: "amount",
          value: "2",
        },
      ];

      // Reset the mock to avoid interference from previous tests
      vi.clearAllMocks();
      mockDatabaseOperations.createOrUpdateParsedIngredientLine = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDatabaseOperations.replaceParsedSegments = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDatabaseOperations.findOrCreateIngredient = vi
        .fn()
        .mockResolvedValue({
          id: "ingredient-1",
          name: "flour",
          isNew: false,
        });
      mockDatabaseOperations.createIngredientReference = vi
        .fn()
        .mockResolvedValue(undefined);

      const result = await action.execute(input, deps, context);

      expect(result.segmentsSaved).toBe(1);
      expect(mockDatabaseOperations.replaceParsedSegments).toHaveBeenCalledWith(
        "line-1",
        [
          {
            index: 0,
            rule: "amount",
            type: "amount",
            value: "2",
            processingTime: undefined,
          },
        ]
      );
    });

    it("filters ingredient segments correctly for tracking", async () => {
      input.parsedSegments = [
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
        {
          index: 3,
          rule: "modifier",
          type: "modifier",
          value: "sifted",
        },
      ];

      // Reset the mock to avoid interference from previous tests
      vi.clearAllMocks();
      mockDatabaseOperations.createOrUpdateParsedIngredientLine = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDatabaseOperations.replaceParsedSegments = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDatabaseOperations.findOrCreateIngredient = vi
        .fn()
        .mockResolvedValue({
          id: "ingredient-1",
          name: "flour",
          isNew: false,
        });
      mockDatabaseOperations.createIngredientReference = vi
        .fn()
        .mockResolvedValue(undefined);

      await action.execute(input, deps, context);

      // Should only track ingredient segments (not amount, unit, or modifier)
      expect(
        mockDatabaseOperations.findOrCreateIngredient
      ).toHaveBeenCalledWith("flour", "2 cups flour");
      expect(
        mockDatabaseOperations.createIngredientReference
      ).toHaveBeenCalledWith({
        ingredientId: "ingredient-1",
        parsedLineId: "line-1",
        segmentIndex: 2,
        reference: "2 cups flour",
        noteId: "note-1",
        context: "main_ingredient",
      });
    });

    it("handles multiple ingredient segments", async () => {
      input.parsedSegments = [
        {
          index: 0,
          rule: "ingredient",
          type: "ingredient",
          value: "flour",
        },
        {
          index: 1,
          rule: "ingredient",
          type: "ingredient",
          value: "sugar",
        },
      ];

      // Reset the mock to avoid interference from previous tests
      vi.clearAllMocks();
      mockDatabaseOperations.createOrUpdateParsedIngredientLine = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDatabaseOperations.replaceParsedSegments = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDatabaseOperations.createIngredientReference = vi
        .fn()
        .mockResolvedValue(undefined);

      // Mock different ingredient IDs for each ingredient
      mockDatabaseOperations.findOrCreateIngredient
        .mockResolvedValueOnce({
          id: "ingredient-1",
          name: "flour",
          isNew: false,
        })
        .mockResolvedValueOnce({
          id: "ingredient-2",
          name: "sugar",
          isNew: false,
        });

      await action.execute(input, deps, context);

      expect(
        mockDatabaseOperations.findOrCreateIngredient
      ).toHaveBeenCalledTimes(2);
      expect(
        mockDatabaseOperations.findOrCreateIngredient
      ).toHaveBeenCalledWith("flour", "2 cups flour");
      expect(
        mockDatabaseOperations.findOrCreateIngredient
      ).toHaveBeenCalledWith("sugar", "2 cups flour");
      expect(
        mockDatabaseOperations.createIngredientReference
      ).toHaveBeenCalledTimes(2);
    });
  });
});

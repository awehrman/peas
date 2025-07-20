import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessIngredientsAction } from "../process-ingredients";
import type { IngredientWorkerDependencies } from "../../types";
import { DatabaseOperations } from "../../../shared/database-operations";
import { PrismaClient } from "@peas/database";

// Mock DatabaseOperations
vi.mock("../../../shared/database-operations");

describe("ProcessIngredientsAction", () => {
  let action: ProcessIngredientsAction;
  let mockDeps: IngredientWorkerDependencies;
  let mockDbOps: {
    updateParsedIngredientLine: ReturnType<typeof vi.fn>;
    replaceParsedSegments: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    action = new ProcessIngredientsAction();

    // Mock DatabaseOperations
    mockDbOps = {
      updateParsedIngredientLine: vi.fn().mockResolvedValue({}),
      replaceParsedSegments: vi.fn().mockResolvedValue({}),
    };
    (DatabaseOperations as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockDbOps
    );

    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      parseIngredient: vi.fn(),
      database: {
        prisma: {} as unknown as PrismaClient,
      },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
      categorizationQueue: {
        add: vi.fn().mockResolvedValue({}),
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ErrorHandler: {
        withErrorHandling: vi.fn((fn) => fn()),
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    };
  });

  describe("execute", () => {
    const baseInput = {
      noteId: "note-123",
      importId: "import-456",
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
      ],
    };

    const mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      noteId: "note-123",
      operation: "test",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    it("should process all ingredient lines successfully", async () => {
      // Mock successful parsing for both lines
      vi.mocked(mockDeps.parseIngredient)
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [
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
          processingTime: 50,
        })
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [
            {
              index: 0,
              rule: "amount",
              type: "amount",
              value: "1",
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
              value: "sugar",
            },
          ],
          processingTime: 45,
        });

      const result = await action.execute(baseInput, mockDeps, mockContext);

      expect(result).toEqual({
        success: true,
        processedCount: 2,
        totalCount: 2,
        errors: [],
      });

      // Verify database operations were called
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledTimes(2);
      expect(mockDbOps.replaceParsedSegments).toHaveBeenCalledTimes(2);
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledWith(
        "line-1",
        {
          parseStatus: "CORRECT",
          parsedAt: expect.any(Date),
        }
      );
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledWith(
        "line-2",
        {
          parseStatus: "CORRECT",
          parsedAt: expect.any(Date),
        }
      );

      // Verify status broadcasting
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-456",
        noteId: "note-123",
        status: "PROCESSING",
        message: "Processed 2/2 ingredient lines",
        currentCount: 2,
        totalCount: 2,
        context: "test",
      });

      // Verify categorization was scheduled
      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "note-123",
          importId: "import-456",
          title: "Recipe with 2 ingredients",
          content: "",
        }
      );

      // Verify logging
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PROCESS_INGREDIENTS] Processing 2 ingredient lines for note note-123"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PROCESS_INGREDIENTS] Successfully processed ingredient line line-1"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PROCESS_INGREDIENTS] Successfully processed ingredient line line-2"
      );
    });

    it("should handle parsing failures gracefully", async () => {
      // Mock one success, one failure
      vi.mocked(mockDeps.parseIngredient)
        .mockResolvedValueOnce({
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
          processingTime: 50,
        })
        .mockResolvedValueOnce({
          success: false,
          parseStatus: "ERROR",
          segments: [],
          errorMessage: "Invalid ingredient format",
          processingTime: 30,
        });

      const result = await action.execute(baseInput, mockDeps, mockContext);

      expect(result).toEqual({
        success: true, // Still true because at least one was processed
        processedCount: 1,
        totalCount: 2,
        errors: [
          {
            lineId: "line-2",
            error: "Invalid ingredient format",
          },
        ],
      });

      // Verify only successful line was updated in database
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledTimes(1);
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledWith(
        "line-1",
        {
          parseStatus: "CORRECT",
          parsedAt: expect.any(Date),
        }
      );

      // Verify error was logged
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PROCESS_INGREDIENTS] Failed to parse ingredient line line-2: Invalid ingredient format",
        "error"
      );
    });

    it("should handle missing line IDs", async () => {
      const inputWithMissingId = {
        ...baseInput,
        ingredientLines: [
          {
            id: "", // Missing ID
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
      };

      const result = await action.execute(
        inputWithMissingId,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 1,
        errors: [
          {
            lineId: "unknown",
            error: "Line ID is missing",
          },
        ],
      });

      // Verify error was logged
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PROCESS_INGREDIENTS] Skipping ingredient line - missing ID",
        "error"
      );
    });

    it("should handle parsing exceptions", async () => {
      // Mock parser to throw an exception
      vi.mocked(mockDeps.parseIngredient).mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const singleLineInput = {
        ...baseInput,
        ingredientLines: [
          {
            id: "line-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
      };

      const result = await action.execute(
        singleLineInput,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 1,
        errors: [
          {
            lineId: "line-1",
            error: "Processing error: Error: Database connection failed",
          },
        ],
      });

      // Verify error was logged
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PROCESS_INGREDIENTS] Error processing ingredient line line-1: Error: Database connection failed",
        "error"
      );
    });

    it("should handle empty ingredient lines array", async () => {
      const emptyInput = {
        ...baseInput,
        ingredientLines: [],
      };

      const result = await action.execute(emptyInput, mockDeps, mockContext);

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 0,
        errors: [],
      });

      // Verify no database operations were called
      expect(mockDbOps.updateParsedIngredientLine).not.toHaveBeenCalled();
      expect(mockDbOps.replaceParsedSegments).not.toHaveBeenCalled();

      // Verify categorization was not scheduled
      expect(mockDeps.categorizationQueue.add).not.toHaveBeenCalled();
    });

    it("should handle successful parsing with no segments", async () => {
      // Mock successful parsing but with no segments
      vi.mocked(mockDeps.parseIngredient).mockResolvedValueOnce({
        success: true,
        parseStatus: "CORRECT",
        segments: [],
        processingTime: 25,
      });

      const singleLineInput = {
        ...baseInput,
        ingredientLines: [
          {
            id: "line-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
      };

      const result = await action.execute(
        singleLineInput,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        success: true,
        processedCount: 1,
        totalCount: 1,
        errors: [],
      });

      // Verify database update was called but not segment replacement
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledWith(
        "line-1",
        {
          parseStatus: "CORRECT",
          parsedAt: expect.any(Date),
        }
      );
      expect(mockDbOps.replaceParsedSegments).not.toHaveBeenCalled();
    });

    it("should handle categorization queue errors", async () => {
      // Mock successful parsing
      vi.mocked(mockDeps.parseIngredient).mockResolvedValueOnce({
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
        processingTime: 50,
      });

      // Mock categorization queue to fail
      vi.mocked(mockDeps.categorizationQueue.add).mockRejectedValueOnce(
        new Error("Queue connection failed")
      );

      const singleLineInput = {
        ...baseInput,
        ingredientLines: [
          {
            id: "line-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
      };

      const result = await action.execute(
        singleLineInput,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        success: true,
        processedCount: 1,
        totalCount: 1,
        errors: [],
      });

      // Verify error was logged
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PROCESS_INGREDIENTS] Failed to schedule categorization for note note-123: Error: Queue connection failed",
        "error"
      );

      // Verify error status was broadcast
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-456",
        noteId: "note-123",
        status: "FAILED",
        message:
          "Failed to schedule categorization: Error: Queue connection failed",
        context: "test",
      });
    });

    it("should not schedule categorization when no lines are processed", async () => {
      // Mock all parsing to fail
      vi.mocked(mockDeps.parseIngredient).mockResolvedValueOnce({
        success: false,
        parseStatus: "ERROR",
        segments: [],
        errorMessage: "Invalid format",
        processingTime: 20,
      });

      const singleLineInput = {
        ...baseInput,
        ingredientLines: [
          {
            id: "line-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
      };

      const result = await action.execute(
        singleLineInput,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 1,
        errors: [
          {
            lineId: "line-1",
            error: "Invalid format",
          },
        ],
      });

      // Verify categorization was not scheduled
      expect(mockDeps.categorizationQueue.add).not.toHaveBeenCalled();
    });

    it("should handle database operation errors", async () => {
      // Mock successful parsing
      vi.mocked(mockDeps.parseIngredient).mockResolvedValueOnce({
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
        processingTime: 50,
      });

      // Mock database operation to fail
      vi.mocked(mockDbOps.updateParsedIngredientLine).mockRejectedValueOnce(
        new Error("Database update failed")
      );

      const singleLineInput = {
        ...baseInput,
        ingredientLines: [
          {
            id: "line-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
      };

      const result = await action.execute(
        singleLineInput,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        success: false,
        processedCount: 0,
        totalCount: 1,
        errors: [
          {
            lineId: "line-1",
            error: "Processing error: Error: Database update failed",
          },
        ],
      });

      // Verify error was logged
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PROCESS_INGREDIENTS] Error processing ingredient line line-1: Error: Database update failed",
        "error"
      );
    });

    it("should handle mixed success and failure scenarios", async () => {
      const threeLineInput = {
        ...baseInput,
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

      // Mock: first success, second failure, third success
      vi.mocked(mockDeps.parseIngredient)
        .mockResolvedValueOnce({
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
          processingTime: 50,
        })
        .mockResolvedValueOnce({
          success: false,
          parseStatus: "ERROR",
          segments: [],
          errorMessage: "Invalid sugar format",
          processingTime: 30,
        })
        .mockResolvedValueOnce({
          success: true,
          parseStatus: "CORRECT",
          segments: [
            {
              index: 0,
              rule: "amount",
              type: "amount",
              value: "3",
            },
          ],
          processingTime: 45,
        });

      const result = await action.execute(
        threeLineInput,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        success: true,
        processedCount: 2,
        totalCount: 3,
        errors: [
          {
            lineId: "line-2",
            error: "Invalid sugar format",
          },
        ],
      });

      // Verify only successful lines were updated
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledTimes(2);
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledWith(
        "line-1",
        expect.any(Object)
      );
      expect(mockDbOps.updateParsedIngredientLine).toHaveBeenCalledWith(
        "line-3",
        expect.any(Object)
      );
    });
  });
});

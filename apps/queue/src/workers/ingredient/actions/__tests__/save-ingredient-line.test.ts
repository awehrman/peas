/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaveIngredientLineAction } from "../save-ingredient-line";
import type { IngredientWorkerDependencies } from "../../types";
import { ProcessIngredientLineOutput } from "../process-ingredient-line";

describe("SaveIngredientLineAction", () => {
  let action: SaveIngredientLineAction;
  let mockDeps: IngredientWorkerDependencies;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new SaveIngredientLineAction();
    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      database: {
        prisma: {
          parsedIngredientLine: {
            upsert: vi.fn().mockResolvedValue({ id: "test-line" }),
            update: vi.fn().mockResolvedValue({ id: "test-line" }),
            create: vi.fn().mockResolvedValue({ id: "test-line" }),
          },
          parsedSegment: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 3 }),
          },
          ingredient: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ id: "test-ingredient", name: "test" }),
            create: vi
              .fn()
              .mockResolvedValue({ id: "new-ingredient", name: "test" }),
          },
          ingredientReference: {
            create: vi.fn().mockResolvedValue({ id: "test-ref" }),
          },
        },
      },
    } as any;
  });

  describe("execute", () => {
    it("should save ingredient line successfully with parsed segments", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "amount",
            value: "3",
          },
          {
            index: 1,
            rule: "test-rule-2",
            type: "unit",
            value: "tbsp",
          },
          {
            index: 2,
            rule: "test-rule-3",
            type: "ingredient",
            value: "canola oil",
          },
        ],
        processingTime: 150,
        importId: "test-import-789",
        currentIngredientIndex: 1,
        totalIngredients: 5,
      };

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result).toEqual({
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        parsedSegments: input.parsedSegments,
        success: true,
        segmentsSaved: 3,
        parseStatus: "CORRECT",
      });

      // Verify DatabaseOperations methods were called
      expect(
        mockDeps.database.prisma.parsedIngredientLine.update
      ).toHaveBeenCalledWith({
        where: { id: "test-line-456" },
        data: {
          parseStatus: "CORRECT",
          parsedAt: expect.any(Date),
        },
      });

      expect(
        mockDeps.database.prisma.parsedSegment.deleteMany
      ).toHaveBeenCalledWith({
        where: { ingredientLineId: "test-line-456" },
      });

      expect(
        mockDeps.database.prisma.parsedSegment.createMany
      ).toHaveBeenCalledWith({
        data: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "amount",
            value: "3",
            ingredientLineId: "test-line-456",
          },
          {
            index: 1,
            rule: "test-rule-2",
            type: "unit",
            value: "tbsp",
            ingredientLineId: "test-line-456",
          },
          {
            index: 2,
            rule: "test-rule-3",
            type: "ingredient",
            value: "canola oil",
            ingredientLineId: "test-line-456",
          },
        ],
      });

      // Check that logger was called with pretty-printed JSON format
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SAVE_INGREDIENT_LINE] Saving parsed segments for note test-note-123, ingredientLineId=test-line-456:"
        )
      );

      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[SAVE_INGREDIENT_LINE] Successfully saved to database: noteId=test-note-123, ingredientLineId=test-line-456, parseStatus=CORRECT, segmentsSaved=3"
      );
    });

    it("should save ingredient line with no parsed segments", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Kosher salt, to taste",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [],
        processingTime: 100,
        importId: "test-import-789",
      };

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result).toEqual({
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Kosher salt, to taste",
        blockIndex: 0,
        lineIndex: 0,
        parsedSegments: [],
        success: true,
        segmentsSaved: 0,
        parseStatus: "CORRECT",
      });

      expect(
        mockDeps.database.prisma.parsedIngredientLine.update
      ).toHaveBeenCalledWith({
        where: { id: "test-line-456" },
        data: {
          parseStatus: "CORRECT",
          parsedAt: expect.any(Date),
        },
      });

      expect(
        mockDeps.database.prisma.parsedSegment.createMany
      ).not.toHaveBeenCalled();
    });

    it("should save ingredient line with undefined parsed segments", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Invalid ingredient",
        blockIndex: 0,
        lineIndex: 0,
        success: false,
        parseStatus: "ERROR",
        parsedSegments: undefined,
        processingTime: 0,
        errorMessage: "Parser failed",
      };

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result).toEqual({
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Invalid ingredient",
        blockIndex: 0,
        lineIndex: 0,
        parsedSegments: undefined,
        success: false,
        segmentsSaved: 0,
        parseStatus: "ERROR",
      });

      expect(
        mockDeps.database.prisma.parsedIngredientLine.update
      ).toHaveBeenCalledWith({
        where: { id: "test-line-456" },
        data: {
          parseStatus: "ERROR",
          parsedAt: expect.any(Date),
        },
      });

      expect(
        mockDeps.database.prisma.parsedSegment.createMany
      ).not.toHaveBeenCalled();
    });

    it("should track ingredients from parsed segments", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "amount",
            value: "3",
          },
          {
            index: 1,
            rule: "test-rule-2",
            type: "unit",
            value: "tbsp",
          },
          {
            index: 2,
            rule: "test-rule-3",
            type: "ingredient",
            value: "canola oil",
          },
        ],
        processingTime: 150,
      };

      // Mock ingredient tracking with pluralize support
      mockDeps.database.prisma.ingredient.findFirst = vi
        .fn()
        .mockResolvedValue({
          id: "ingredient-123",
          name: "canola oil",
        });

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result.segmentsSaved).toBe(3);

      // Verify ingredient tracking was called with pluralize support
      expect(
        mockDeps.database.prisma.ingredient.findFirst
      ).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: "canola oil" },
            { name: "canola oils" },
            { name: "canola oil" },
            {
              aliases: {
                some: {
                  name: {
                    in: ["canola oil", "canola oils", "canola oil"],
                  },
                },
              },
            },
          ],
        },
      });

      expect(
        mockDeps.database.prisma.ingredientReference.create
      ).toHaveBeenCalledWith({
        data: {
          ingredientId: "ingredient-123",
          parsedLineId: "test-line-456",
          segmentIndex: 2,
          reference: "3 tbsp. canola oil",
          noteId: "test-note-123",
          confidence: 1.0,
          context: "main_ingredient",
        },
      });
    });

    it("should create new ingredient when it doesn't exist", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "2 cups exotic spice",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "amount",
            value: "2",
          },
          {
            index: 1,
            rule: "test-rule-2",
            type: "unit",
            value: "cups",
          },
          {
            index: 2,
            rule: "test-rule-3",
            type: "ingredient",
            value: "exotic spice",
          },
        ],
        processingTime: 150,
      };

      // Mock ingredient not found, then created
      mockDeps.database.prisma.ingredient.findFirst = vi
        .fn()
        .mockResolvedValue(null);
      mockDeps.database.prisma.ingredient.create = vi.fn().mockResolvedValue({
        id: "new-ingredient-456",
        name: "exotic spice",
      });

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result.segmentsSaved).toBe(3);

      expect(
        mockDeps.database.prisma.ingredient.findFirst
      ).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: "exotic spice" },
            { name: "exotic spices" },
            { name: "exotic spice" },
            {
              aliases: {
                some: {
                  name: {
                    in: ["exotic spice", "exotic spices", "exotic spice"],
                  },
                },
              },
            },
          ],
        },
      });

      expect(mockDeps.database.prisma.ingredient.create).toHaveBeenCalledWith({
        data: {
          name: "exotic spice",
          plural: "exotic spices",
          description: "Ingredient found in recipe: 2 cups exotic spice",
        },
      });

      expect(
        mockDeps.database.prisma.ingredientReference.create
      ).toHaveBeenCalledWith({
        data: {
          ingredientId: "new-ingredient-456",
          parsedLineId: "test-line-456",
          segmentIndex: 2,
          reference: "2 cups exotic spice",
          noteId: "test-note-123",
          confidence: 1.0,
          context: "main_ingredient",
        },
      });
    });

    it("should handle missing ingredientLineId gracefully", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "", // Empty ingredientLineId
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "ingredient",
            value: "canola oil",
          },
        ],
        processingTime: 150,
      };

      await expect(
        action.execute(input, mockDeps, {
          jobId: "test-job-123",
          retryCount: 0,
          queueName: "test-queue",
          operation: "test-operation",
          startTime: Date.now(),
          timing: { startTime: Date.now(), duration: 0 },
          metadata: {},
        } as any)
      ).rejects.toThrow(
        "ingredientLineId is required for SaveIngredientLineAction"
      );
    });

    it("should handle missing noteId gracefully", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "", // Empty noteId
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "ingredient",
            value: "canola oil",
          },
        ],
        processingTime: 150,
      };

      await expect(
        action.execute(input, mockDeps, {
          jobId: "test-job-123",
          retryCount: 0,
          queueName: "test-queue",
          operation: "test-operation",
          startTime: Date.now(),
          timing: { startTime: Date.now(), duration: 0 },
          metadata: {},
        } as any)
      ).rejects.toThrow("noteId is required for SaveIngredientLineAction");
    });

    it("should handle database errors gracefully", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "ingredient",
            value: "canola oil",
          },
        ],
        processingTime: 150,
      };

      // Mock database error on update
      mockDeps.database.prisma.parsedIngredientLine.update = vi
        .fn()
        .mockRejectedValue(new Error("Database connection failed"));

      await expect(
        action.execute(input, mockDeps, {
          jobId: "test-job-123",
          retryCount: 0,
          queueName: "test-queue",
          operation: "test-operation",
          startTime: Date.now(),
          timing: { startTime: Date.now(), duration: 0 },
          metadata: {},
        } as any)
      ).rejects.toThrow(
        "Failed to save ingredient line: Database save failed: Error: Database connection failed"
      );

      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[SAVE_INGREDIENT_LINE] Database save failed: Error: Database connection failed"
      );
    });

    it("should handle ingredient tracking errors gracefully", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "ingredient",
            value: "canola oil",
          },
        ],
        processingTime: 150,
      };

      // Mock ingredient tracking error
      mockDeps.database.prisma.ingredient.findFirst = vi
        .fn()
        .mockRejectedValue(new Error("Ingredient tracking failed"));

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      // Should still succeed even if ingredient tracking fails
      expect(result.success).toBe(true);
      expect(result.segmentsSaved).toBe(1);

      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[TRACK_INGREDIENTS] Error tracking ingredients: Ingredient tracking failed"
      );
    });

    it("should handle missing logger dependency", async () => {
      const input: ProcessIngredientLineOutput & {
        importId?: string;
        currentIngredientIndex?: number;
        totalIngredients?: number;
      } = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "test-rule-1",
            type: "ingredient",
            value: "canola oil",
          },
        ],
        processingTime: 150,
      };

      const depsWithoutLogger = {
        database: {
          prisma: {
            parsedIngredientLine: {
              upsert: vi.fn().mockResolvedValue({ id: "test-line" }),
              update: vi.fn().mockResolvedValue({ id: "test-line" }),
            },
            parsedSegment: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              createMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
            ingredient: {
              findFirst: vi.fn().mockResolvedValue({
                id: "test-ingredient",
                name: "canola oil",
              }),
            },
            ingredientReference: {
              create: vi.fn().mockResolvedValue({ id: "test-ref" }),
            },
          },
        },
      } as any;

      const result = await action.execute(input, depsWithoutLogger, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result.success).toBe(true);
      expect(result.segmentsSaved).toBe(1);
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("save-ingredient-line");
    });
  });
});

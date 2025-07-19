/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessIngredientLineAction } from "../process-ingredient-line";
import type { IngredientWorkerDependencies } from "../../types";

describe("ProcessIngredientLineAction", () => {
  let action: ProcessIngredientLineAction;
  let mockDeps: IngredientWorkerDependencies;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new ProcessIngredientLineAction();
    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      parseIngredient: vi.fn(),
    } as any;
  });

  describe("execute", () => {
    it("should process ingredient line successfully with valid parser output", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
      };

      const mockParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 150,
        rule: "#1_ingredientLine",
        type: "line",
        values: [
          {
            rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
            type: "amount",
            value: "3",
          },
          {
            rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
            type: "unit",
            value: "tbsp",
          },
          {
            rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
            type: "ingredient",
            value: "canola oil",
          },
        ],
      };

      mockDeps.parseIngredient = vi.fn().mockResolvedValue(mockParseResult);

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
        success: true,
        parseStatus: "CORRECT",
        parsedSegments: [
          {
            index: 0,
            rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
            type: "amount",
            value: "3",
            processingTime: 150,
          },
          {
            index: 1,
            rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
            type: "unit",
            value: "tbsp",
            processingTime: 150,
          },
          {
            index: 2,
            rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
            type: "ingredient",
            value: "canola oil",
            processingTime: 150,
          },
        ],
        errorMessage: undefined,
        processingTime: 150,
      });

      expect(mockDeps.parseIngredient).toHaveBeenCalledWith(
        "3 tbsp. canola oil"
      );
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        'Processing ingredient line for note test-note-123: ingredientLineId=test-line-456, reference="3 tbsp. canola oil", blockIndex=0, lineIndex=0'
      );
    });

    it("should handle parser output with empty values array", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Kosher salt, to taste",
        blockIndex: 0,
        lineIndex: 0,
      };

      const mockParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 100,
        rule: "#1_ingredientLine",
        type: "line",
        values: [],
      };

      mockDeps.parseIngredient = vi.fn().mockResolvedValue(mockParseResult);

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result.parsedSegments).toBeDefined();
      expect(result.parsedSegments).toHaveLength(0);
      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
    });

    it("should handle parser output with missing values property", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Invalid ingredient",
        blockIndex: 0,
        lineIndex: 0,
      };

      const mockParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 50,
        rule: "#1_ingredientLine",
        type: "line",
        // Missing values property
      };

      mockDeps.parseIngredient = vi.fn().mockResolvedValue(mockParseResult);

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result.parsedSegments).toBeDefined();
      expect(result.parsedSegments).toHaveLength(0);
      expect(result.success).toBe(true);
    });

    it("should handle parser output with non-array values", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Invalid ingredient",
        blockIndex: 0,
        lineIndex: 0,
      };

      const mockParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 50,
        rule: "#1_ingredientLine",
        type: "line",
        values: "not an array", // Invalid values type
      };

      mockDeps.parseIngredient = vi.fn().mockResolvedValue(mockParseResult);

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result.parsedSegments).toBeDefined();
      expect(result.parsedSegments).toHaveLength(0);
      expect(result.success).toBe(true);
    });

    it("should handle parser output with invalid value objects", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Invalid ingredient",
        blockIndex: 0,
        lineIndex: 0,
      };

      const mockParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 50,
        rule: "#1_ingredientLine",
        type: "line",
        values: [
          { rule: "test-rule", type: "amount", value: "" }, // Empty value
          { rule: "test-rule", type: "unit", value: "   " }, // Whitespace only
          { rule: "test-rule", type: "ingredient", value: "valid ingredient" }, // Valid value
        ],
      };

      mockDeps.parseIngredient = vi.fn().mockResolvedValue(mockParseResult);

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result.parsedSegments).toBeDefined();
      expect(result.parsedSegments).toHaveLength(3); // All segments including empty ones
      expect(result.parsedSegments![0]!.value).toBe("");
      expect(result.parsedSegments![0]!.processingTime).toBe(50);
      expect(result.parsedSegments![1]!.value).toBe("   ");
      expect(result.parsedSegments![1]!.processingTime).toBe(50);
      expect(result.parsedSegments![2]!.value).toBe("valid ingredient");
      expect(result.parsedSegments![2]!.processingTime).toBe(50);
    });

    it("should handle parser failure gracefully", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Invalid ingredient",
        blockIndex: 0,
        lineIndex: 0,
      };

      const mockParseResult = {
        success: false,
        parseStatus: "ERROR" as const,
        errorMessage: "Parser failed",
        processingTime: 0,
      };

      mockDeps.parseIngredient = vi.fn().mockResolvedValue(mockParseResult);

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
        success: false,
        parseStatus: "ERROR",
        parsedSegments: undefined,
        errorMessage: "Parser failed",
        processingTime: 0,
      });
    });

    it("should handle parser throwing an error", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "Invalid ingredient",
        blockIndex: 0,
        lineIndex: 0,
      };

      mockDeps.parseIngredient = vi
        .fn()
        .mockRejectedValue(new Error("Parser crashed"));

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
        importId: undefined,
        currentIngredientIndex: undefined,
        totalIngredients: undefined,
        success: false,
        parseStatus: "ERROR",
        errorMessage: "Parser crashed",
      });
    });

    it("should handle missing logger dependency", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "3 tbsp. canola oil",
        blockIndex: 0,
        lineIndex: 0,
      };

      const mockParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 100,
        rule: "#1_ingredientLine",
        type: "line",
        values: [
          {
            rule: "test-rule",
            type: "amount",
            value: "3",
          },
        ],
      };

      const depsWithoutLogger = {
        parseIngredient: vi.fn().mockResolvedValue(mockParseResult),
      } as any;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

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
      expect(consoleSpy).toHaveBeenCalledWith(
        "Processing ingredient line for note test-note-123:",
        expect.objectContaining({
          ingredientLineId: "test-line-456",
          reference: "3 tbsp. canola oil",
          blockIndex: 0,
          lineIndex: 0,
        })
      );

      consoleSpy.mockRestore();
    });

    it("should handle complex parser output with mixed data types", async () => {
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: "1½ tsp. freshly ground black pepper",
        blockIndex: 0,
        lineIndex: 0,
      };

      const mockParseResult = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 200,
        rule: "#1_ingredientLine",
        type: "line",
        values: [
          {
            rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #3_amountExpression >> #5_amount",
            type: "amount",
            value: "1",
          },
          {
            rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #3_amountExpression >> #2_amount",
            type: "amount",
            value: "1/2",
          },
          {
            rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
            type: "unit",
            value: "tsp",
          },
          {
            rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #1_descriptors >> #2_descriptor",
            type: "descriptor",
            value: "freshly",
          },
          {
            rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #1_descriptors >> #2_descriptorListEnding >> #2_descriptor",
            type: "descriptor",
            value: "ground",
          },
          {
            rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #2_ingredient",
            type: "ingredient",
            value: "black pepper",
          },
        ],
      };

      mockDeps.parseIngredient = vi.fn().mockResolvedValue(mockParseResult);

      const result = await action.execute(input, mockDeps, {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        timing: { startTime: Date.now(), duration: 0 },
        metadata: {},
      } as any);

      expect(result.parsedSegments).toBeDefined();
      expect(result.parsedSegments).toHaveLength(6);
      expect(result.parsedSegments![0]!.value).toBe("1");
      expect(result.parsedSegments![0]!.type).toBe("amount");
      expect(result.parsedSegments![1]!.value).toBe("1/2");
      expect(result.parsedSegments![1]!.type).toBe("amount");
      expect(result.parsedSegments![2]!.value).toBe("tsp");
      expect(result.parsedSegments![2]!.type).toBe("unit");
      expect(result.parsedSegments![3]!.value).toBe("freshly");
      expect(result.parsedSegments![3]!.type).toBe("descriptor");
      expect(result.parsedSegments![4]!.value).toBe("ground");
      expect(result.parsedSegments![4]!.type).toBe("descriptor");
      expect(result.parsedSegments![5]!.value).toBe("black pepper");
      expect(result.parsedSegments![5]!.type).toBe("ingredient");
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("process_ingredient_line");
    });
  });
});

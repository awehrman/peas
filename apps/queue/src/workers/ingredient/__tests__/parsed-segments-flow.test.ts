/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessIngredientLineAction } from "../actions/process-ingredient-line";
import { SaveIngredientLineAction } from "../actions/save-ingredient-line";
import { TrackPatternAction } from "../actions/track-pattern";

describe("Parsed Segments Flow", () => {
  let mockDeps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      database: {
        prisma: {
          parsedIngredientLine: {
            upsert: vi.fn().mockResolvedValue({ id: "test-line" }),
            update: vi.fn().mockResolvedValue({ id: "test-line" }),
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
      parseIngredient: vi.fn().mockResolvedValue({
        success: true,
        parseStatus: "CORRECT",
        processingTime: 410,
        // This is the actual structure from the logs
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
      }),
    };
  });

  it("should pass parsed segments through the entire pipeline with real parser output", async () => {
    // Step 1: Process ingredient line
    const processAction = new ProcessIngredientLineAction();
    const processInput = {
      noteId: "test-note-123",
      ingredientLineId: "test-line-456",
      reference: "3 tbsp. canola oil",
      blockIndex: 0,
      lineIndex: 0,
    };

    const processOutput = await processAction.execute(processInput, mockDeps, {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      timing: { startTime: Date.now(), duration: 0 },
      metadata: {},
    } as any);

    // Verify process action output contains parsed segments
    expect(processOutput.parsedSegments).toBeDefined();
    expect(processOutput.parsedSegments).toHaveLength(3);
    expect(processOutput.parsedSegments![0]!.value).toBe("3");
    expect(processOutput.parsedSegments![0]!.type).toBe("amount");
    expect(processOutput.parsedSegments![1]!.value).toBe("tbsp");
    expect(processOutput.parsedSegments![1]!.type).toBe("unit");
    expect(processOutput.parsedSegments![2]!.value).toBe("canola oil");
    expect(processOutput.parsedSegments![2]!.type).toBe("ingredient");

    // Step 2: Save ingredient line
    const saveAction = new SaveIngredientLineAction();
    const saveInput = {
      ...processOutput,
      importId: "test-import-789",
      currentIngredientIndex: 1,
      totalIngredients: 5,
    };

    const saveOutput = await saveAction.execute(saveInput, mockDeps, {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      timing: { startTime: Date.now(), duration: 0 },
      metadata: {},
    } as any);

    // Verify save action passes through parsed segments
    expect(saveOutput.parsedSegments).toBeDefined();
    expect(saveOutput.parsedSegments).toHaveLength(3);
    expect(saveOutput.parsedSegments![0]!.value).toBe("3");
    expect(saveOutput.parsedSegments![1]!.value).toBe("tbsp");
    expect(saveOutput.parsedSegments![2]!.value).toBe("canola oil");

    // Step 3: Track pattern
    const trackAction = new TrackPatternAction();
    const trackInput = {
      noteId: saveOutput.noteId,
      ingredientLineId: saveOutput.ingredientLineId,
      reference: saveOutput.reference,
      parsedSegments: saveOutput.parsedSegments,
    };

    // Mock the pattern tracker
    const mockPatternTracker = {
      trackPattern: vi.fn().mockResolvedValue(undefined),
    };

    // Update mockDeps to include patternTracker
    mockDeps.database.patternTracker = mockPatternTracker;

    const trackOutput = await trackAction.execute(trackInput, mockDeps);

    // Verify track action receives and processes parsed segments
    expect(trackOutput).toEqual(trackInput);
    expect(mockPatternTracker.trackPattern).toHaveBeenCalledWith(
      [
        {
          rule: trackInput.parsedSegments![0]!.rule,
          ruleNumber: 0,
        },
        {
          rule: trackInput.parsedSegments![1]!.rule,
          ruleNumber: 1,
        },
        {
          rule: trackInput.parsedSegments![2]!.rule,
          ruleNumber: 2,
        },
      ],
      trackInput.reference
    );
  });

  it("should handle parser output with no values gracefully", async () => {
    // Mock parser to return no values (like some of the logs showed)
    mockDeps.parseIngredient.mockResolvedValue({
      success: true,
      parseStatus: "CORRECT",
      processingTime: 410,
      rule: "#1_ingredientLine",
      type: "line",
      values: [], // Empty values array
    });

    const processAction = new ProcessIngredientLineAction();
    const processInput = {
      noteId: "test-note-123",
      ingredientLineId: "test-line-456",
      reference: "Kosher salt, to taste",
      blockIndex: 0,
      lineIndex: 0,
    };

    const processOutput = await processAction.execute(processInput, mockDeps, {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      timing: { startTime: Date.now(), duration: 0 },
      metadata: {},
    } as any);

    // Should have empty parsed segments
    expect(processOutput.parsedSegments).toBeDefined();
    expect(processOutput.parsedSegments).toHaveLength(0);
  });
});

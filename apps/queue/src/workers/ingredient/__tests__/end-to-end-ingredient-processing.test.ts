import { PrismaClient } from "@peas/database";
import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorHandler } from "../../../utils/error-handler";
import { createIngredientWorker } from "../worker";

// Mock the parser module
vi.mock("@peas/parser", () => ({
  v1: {
    parse: vi.fn(),
  },
}));

// Create a single mock Queue instance for all queues
const mockQueue = new Queue("mock", {
  connection: {} as Record<string, unknown>,
});

// Create a mock PrismaClient instance
const mockPrisma = new PrismaClient();

// Mock service container
const makeContainer = (overrides = {}) => ({
  statusBroadcaster: { addStatusEventAndBroadcast: vi.fn() },
  errorHandler: { errorHandler: ErrorHandler },
  logger: { log: vi.fn() },
  queues: {
    noteQueue: mockQueue,
    imageQueue: mockQueue,
    ingredientQueue: mockQueue,
    instructionQueue: mockQueue,
    categorizationQueue: mockQueue,
    sourceQueue: mockQueue,
  },
  database: { prisma: mockPrisma },
  healthMonitor: { healthMonitor: {} },
  webSocket: { webSocketManager: null },
  parsers: { parsers: null },
  config: {
    port: 0,
    wsPort: 0,
    redisConnection: {},
    batchSize: 0,
    maxRetries: 0,
    backoffMs: 0,
    maxBackoffMs: 0,
  },
  close: async () => {},
  ...overrides,
});

describe("End-to-End Ingredient Processing", () => {
  let container: ReturnType<typeof makeContainer>;
  let queue: Queue;

  beforeEach(() => {
    container = makeContainer();
    queue = { add: vi.fn() } as unknown as Queue;
    vi.resetAllMocks();
  });

  it("should process ingredient line end-to-end with real parser output", async () => {
    // Mock the parser to return realistic data
    const { v1 } = await import("@peas/parser");
    vi.mocked(v1.parse).mockReturnValue({
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
          rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #1_descriptors >> #2_descriptor",
          type: "descriptor",
          value: "of",
        },
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #1_descriptors >> #2_descriptorListEnding >> #2_descriptor",
          type: "descriptor",
          value: "neutral",
        },
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #2_ingredient",
          type: "ingredient",
          value: "oil",
        },
      ],
    });

    const worker = createIngredientWorker(queue, container);
    const result = await worker["dependencies"].parseIngredient(
      "3 tbsp of neutral oil"
    );

    // Verify parsing was successful
    expect(result.success).toBe(true);
    expect(result.parseStatus).toBe("CORRECT");
    expect(result.segments).toHaveLength(5);

    // Verify segments have correct structure
    expect(result.segments[0]).toEqual({
      index: 0,
      rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
      type: "amount",
      value: "3",
      processingTime: 0,
    });

    expect(result.segments[1]).toEqual({
      index: 1,
      rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
      type: "unit",
      value: "tbsp",
      processingTime: 0,
    });

    expect(result.segments[4]).toEqual({
      index: 4,
      rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #2_ingredient",
      type: "ingredient",
      value: "oil",
      processingTime: 0,
    });

    // Verify logging
    expect(container.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Parsing ingredient")
    );
    expect(container.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Ingredient parsing completed: CORRECT")
    );
  });

  it("should handle complex ingredient with multiple descriptors", async () => {
    // Mock the parser to return data for a complex ingredient
    const { v1 } = await import("@peas/parser");
    vi.mocked(v1.parse).mockReturnValue({
      rule: "#1_ingredientLine",
      type: "line",
      values: [
        {
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
          type: "amount",
          value: "2",
        },
        {
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
          type: "unit",
          value: "tsp",
        },
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #1_descriptors >> #2_descriptor",
          type: "descriptor",
          value: "sticky",
        },
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #2_ingredient",
          type: "ingredient",
          value: "rice",
        },
        {
          rule: "#1_ingredientLine >> #1_comment",
          type: "comment",
          value: ", uncooked",
        },
      ],
    });

    const worker = createIngredientWorker(queue, container);
    const result = await worker["dependencies"].parseIngredient(
      "2 tsp sticky rice, uncooked"
    );

    // Verify parsing was successful
    expect(result.success).toBe(true);
    expect(result.parseStatus).toBe("CORRECT");
    expect(result.segments).toHaveLength(5);

    // Verify the ingredient segment is correctly identified
    const ingredientSegment = result.segments.find(
      (s) => s.type === "ingredient"
    );
    expect(ingredientSegment).toBeDefined();
    expect(ingredientSegment!.value).toBe("rice");

    // Verify descriptors are captured
    const descriptorSegments = result.segments.filter(
      (s) => s.type === "descriptor"
    );
    expect(descriptorSegments).toHaveLength(1);
    expect(descriptorSegments[0].value).toBe("sticky");

    // Verify comment is captured
    const commentSegment = result.segments.find((s) => s.type === "comment");
    expect(commentSegment).toBeDefined();
    expect(commentSegment!.value).toBe(", uncooked");
  });

  it("should handle ingredient with no quantities", async () => {
    // Mock the parser to return data for an ingredient without quantities
    const { v1 } = await import("@peas/parser");
    vi.mocked(v1.parse).mockReturnValue({
      rule: "#1_ingredientLine",
      type: "line",
      values: [
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #2_ingredient",
          type: "ingredient",
          value: "salt",
        },
        {
          rule: "#1_ingredientLine >> #1_comment",
          type: "comment",
          value: ", to taste",
        },
      ],
    });

    const worker = createIngredientWorker(queue, container);
    const result =
      await worker["dependencies"].parseIngredient("salt, to taste");

    // Verify parsing was successful
    expect(result.success).toBe(true);
    expect(result.parseStatus).toBe("CORRECT");
    expect(result.segments).toHaveLength(2);

    // Verify the ingredient segment is correctly identified
    const ingredientSegment = result.segments.find(
      (s) => s.type === "ingredient"
    );
    expect(ingredientSegment).toBeDefined();
    expect(ingredientSegment!.value).toBe("salt");
  });
});

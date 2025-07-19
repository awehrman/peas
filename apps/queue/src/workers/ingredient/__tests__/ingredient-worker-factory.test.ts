import { describe, it, expect, vi, beforeEach } from "vitest";
import { createIngredientWorker } from "../ingredient-worker";
import { Queue } from "bullmq";
import { PrismaClient } from "@peas/database";
import { ErrorHandler } from "../../../utils/error-handler";

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

describe("createIngredientWorker", () => {
  let container: ReturnType<typeof makeContainer>;
  let queue: Queue;

  beforeEach(() => {
    container = makeContainer();
    queue = { add: vi.fn() } as unknown as Queue;
    vi.resetAllMocks();
  });

  it("returns an IngredientWorker instance", () => {
    const worker = createIngredientWorker(queue, container);
    expect(worker).toBeInstanceOf(Object.getPrototypeOf(worker).constructor);
    expect(typeof worker["createActionPipeline"]).toBe("function");
  });

  it("wires up logger and dependencies", () => {
    const worker = createIngredientWorker(queue, container);
    expect(worker["dependencies"].logger).toBe(container.logger);
    expect(worker["dependencies"].categorizationQueue).toBe(
      container.queues.categorizationQueue
    );
  });

  describe("parseIngredient", () => {
    it("parses successfully and logs output", async () => {
      // Mock the parser to return valid data in the new format
      const { v1 } = await import("@peas/parser");
      vi.mocked(v1.parse).mockReturnValue({
        rule: "#1_ingredientLine",
        type: "line",
        values: [
          { rule: "r1", type: "ingredient", value: "onion" },
          { rule: "r2", type: "amount", value: "2" },
        ],
      });

      const worker = createIngredientWorker(queue, container);
      const result = await worker["dependencies"].parseIngredient("2 onions");
      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(2);
      expect(container.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Parsing ingredient text")
      );
      expect(container.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Parsing completed with status")
      );
      expect(container.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Parsed result details")
      );
    });

    it("handles parser error and logs it", async () => {
      // Mock the parser to throw an error
      const { v1 } = await import("@peas/parser");
      vi.mocked(v1.parse).mockImplementation(() => {
        throw new Error("parse fail");
      });

      const worker = createIngredientWorker(queue, container);
      const result = await worker["dependencies"].parseIngredient("bad input");
      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.errorMessage).toBe("parse fail");
      expect(container.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Parsing failed: parse fail")
      );
    });

    it("handles parser returning no values", async () => {
      // Mock the parser to return data with undefined values
      const { v1 } = await import("@peas/parser");
      vi.mocked(v1.parse).mockReturnValue({ values: undefined });

      const worker = createIngredientWorker(queue, container);
      const result = await worker["dependencies"].parseIngredient("empty");
      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.errorMessage).toBe("Parser returned no valid data");
    });

    it("handles empty input string", async () => {
      // Mock the parser to return data with empty values array
      const { v1 } = await import("@peas/parser");
      vi.mocked(v1.parse).mockReturnValue({ values: [] });

      const worker = createIngredientWorker(queue, container);
      const result = await worker["dependencies"].parseIngredient("");
      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.errorMessage).toBe("Empty or invalid input text");
    });
  });
});

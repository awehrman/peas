import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInstructionWorker } from "../instruction-worker";
import { Queue } from "bullmq";
import { IServiceContainer } from "../../../services/container";

describe("InstructionWorker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = { name: "instruction-queue" } as Queue;
    mockContainer = {
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      },
      errorHandler: {
        errorHandler: {
          withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
        },
      },
      logger: {
        log: vi.fn(),
      },
      database: {
        prisma: {
          parsedIngredientLine: {
            count: vi.fn().mockResolvedValue(5),
          },
        },
      },
      parsers: {
        parseInstruction: vi.fn().mockResolvedValue({
          success: true,
          parseStatus: "CORRECT",
          normalizedText: "test",
          steps: [],
          processingTime: 0,
        }),
      },
    } as unknown as IServiceContainer;
  });

  describe("createInstructionWorker", () => {
    it("should create an instruction worker with correct dependencies", () => {
      const worker = createInstructionWorker(mockQueue, mockContainer);
      expect(worker).toBeDefined();
    });
  });
});

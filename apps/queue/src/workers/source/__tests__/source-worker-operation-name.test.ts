import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SourceWorker } from "../source-worker";
import type { SourceWorkerDependencies } from "../types";

// Mock the constants
vi.mock("../../../config/constants", () => ({
  WORKER_CONSTANTS: {
    NAMES: {
      SOURCE: "source",
    },
  },
}));

// Mock the actions registration
vi.mock("../actions", () => ({
  registerSourceActions: vi.fn(),
}));

describe("SourceWorker getOperationName", () => {
  let mockQueue: Queue;
  let mockDependencies: SourceWorkerDependencies;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock queue
    mockQueue = {
      name: "source-queue",
    } as unknown as Queue;

    // Create mock dependencies
    mockDependencies = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
      },
      sourceProcessor: {
        processSource: vi.fn().mockResolvedValue({
          success: true,
          processedData: {
            title: "Test Source",
            content: "Test content",
            metadata: {
              type: "source",
              processedAt: new Date().toISOString(),
            },
          },
          processingTime: 50,
        }),
      },
      database: {
        saveSource: vi.fn().mockResolvedValue({
          id: "source_123",
          title: "Test Source",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    };
  });

  it("should return correct operation name", () => {
    // Create a real SourceWorker instance to test the actual getOperationName method
    const worker = new SourceWorker(mockQueue, mockDependencies);
    const operationName = worker["getOperationName"]();
    expect(operationName).toBe("source");
  });
});

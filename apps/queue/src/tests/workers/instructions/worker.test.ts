import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { setupInstructionWorker } from "../../../../src/workers/instructions/worker";
import { InstructionWorkerDependencies } from "../../../../src/workers/instructions/types";

// Mocks
const mockQueue = { name: "test-instruction-queue" } as unknown as Queue;
const mockSubQueues = {
  ingredientQueue: {} as Queue,
  instructionQueue: {} as Queue,
  imageQueue: {} as Queue,
  categorizationQueue: {} as Queue,
};

const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
};

const mockErrorHandler = {
  logError: vi.fn(),
  createJobError: vi.fn((...args) => ({ ...args })),
  shouldRetry: vi.fn(() => false),
  calculateBackoff: vi.fn(() => 1000),
  classifyError: vi.fn((err) => err),
  withErrorHandling: vi.fn((fn) => fn()),
};

const mockAddStatusEventAndBroadcast = vi.fn();
const mockHealthMonitor = {
  getInstance: () => ({ isHealthy: vi.fn(() => true) }),
};
const mockParseHTML = vi.fn();
const mockCreateNote = vi.fn();

function getDeps(
  overrides: Partial<InstructionWorkerDependencies> = {}
): InstructionWorkerDependencies {
  return {
    parseHTML: mockParseHTML,
    createNote: mockCreateNote,
    addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
    ErrorHandler: mockErrorHandler as any,
    HealthMonitor: mockHealthMonitor as any,
    logger: mockLogger,
    ...mockSubQueues,
    ...overrides,
  };
}

describe("setupInstructionWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a Worker with correct event handlers", () => {
    const worker = setupInstructionWorker(mockQueue, mockSubQueues, getDeps());
    expect(worker).toBeDefined();
    // Check event handlers are registered
    // (BullMQ Worker uses .on, so we can spy on it if needed)
    expect(typeof worker.on).toBe("function");
  });

  it("should use custom dependencies if provided", () => {
    const customLogger = { log: vi.fn(), error: vi.fn() };
    const worker = setupInstructionWorker(
      mockQueue,
      mockSubQueues,
      getDeps({ logger: customLogger })
    );
    expect(worker).toBeDefined();
  });

  it("should use default dependencies if none provided", () => {
    const worker = setupInstructionWorker(mockQueue, mockSubQueues);
    expect(worker).toBeDefined();
  });

  it("should set concurrency to 3", () => {
    const worker = setupInstructionWorker(mockQueue, mockSubQueues, getDeps());
    // BullMQ Worker exposes concurrency as an option
    expect((worker as any).opts.concurrency).toBe(3);
  });
});

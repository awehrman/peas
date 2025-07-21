import { baseData, mockDatabaseService } from "./test-fixtures";

import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WORKER_CONSTANTS } from "../../../config/constants";
import { redisConnection } from "../../../config/redis";
import type { IServiceContainer } from "../../../services/container";
import { ErrorHandler } from "../../../utils/error-handler";
import {
  createMockHealthMonitor,
  mockActionFactory,
  mockLogger,
  mockQueueService,
} from "../../__tests__/test-utils";
import type { ActionContext } from "../../core/types";
import { createInstructionWorkerDependencies } from "../dependencies";
import type { InstructionWorkerDependencies } from "../types";
import { InstructionWorker, createInstructionWorker } from "../worker";

vi.mock("../actions", () => ({ registerInstructionActions: vi.fn() }));
vi.mock("../pipeline", () => ({
  createInstructionPipeline: vi.fn(() => [
    {
      name: "mock_action",
      execute: vi.fn(),
      executeWithTiming: vi.fn(),
      withConfig: vi.fn(),
    },
  ]),
}));
vi.mock("../dependencies", () => ({
  createInstructionWorkerDependencies: vi.fn(() => ({
    logger: { log: vi.fn() },
  })),
}));

const mockQueue = { name: "test-queue" } as Queue;
const mockDeps: InstructionWorkerDependencies = {
  logger: mockLogger,
  database: mockDatabaseService,
  addStatusEventAndBroadcast: vi.fn(),
  ErrorHandler: {
    withErrorHandling: vi.fn(async (operation) => await operation()),
  },
};
const mockContainer: IServiceContainer = {
  logger: mockLogger,
  statusBroadcaster: {
    addStatusEventAndBroadcast: vi.fn(),
    statusBroadcaster: null,
  },
  errorHandler: { errorHandler: ErrorHandler },
  queues: mockQueueService,
  database: mockDatabaseService,
  healthMonitor: { healthMonitor: createMockHealthMonitor() },
  webSocket: { webSocketManager: null },
  config: {
    port: 0,
    wsPort: 0,
    wsHost: "",
    wsUrl: "",
    redisConnection,
    batchSize: 0,
    maxRetries: 0,
    backoffMs: 0,
    maxBackoffMs: 0,
  },
  parsers: { parsers: null },
  close: vi.fn(),
};
const mockContext = {} as ActionContext;

describe("InstructionWorker", () => {
  let worker: InstructionWorker;
  beforeEach(() => {
    worker = new InstructionWorker(
      mockQueue,
      mockDeps,
      mockActionFactory,
      mockContainer
    );
    vi.clearAllMocks();
  });

  it("registerActions calls registerInstructionActions", async () => {
    const { registerInstructionActions } = await import("../actions");
    worker["registerActions"]();
    expect(registerInstructionActions).toHaveBeenCalledWith(
      worker["actionFactory"]!
    );
  });

  it("getOperationName returns correct value", () => {
    expect(worker["getOperationName"]()).toBe(
      WORKER_CONSTANTS.NAMES.INSTRUCTION
    );
  });

  it("addStatusActions logs as expected", () => {
    worker["addStatusActions"]([], baseData);
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining("addStatusActions called with data: noteId=note")
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining("Skipping generic status actions")
    );
  });

  it("createActionPipeline delegates to createInstructionPipeline with correct context", async () => {
    const { createInstructionPipeline } = await import("../pipeline");
    const actions = worker["createActionPipeline"](baseData, mockContext);
    expect(createInstructionPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        addStatusActions: expect.any(Function),
        createWrappedAction: expect.any(Function),
        createErrorHandledAction: expect.any(Function),
        dependencies: mockDeps,
      }),
      baseData,
      mockContext
    );
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]?.name).toBe("mock_action");
  });
});

describe("createInstructionWorker", () => {
  it("wires dependencies and returns an InstructionWorker", () => {
    const worker = createInstructionWorker(mockQueue, mockContainer);
    expect(worker).toBeInstanceOf(InstructionWorker);
    expect(createInstructionWorkerDependencies).toHaveBeenCalledWith(
      mockContainer
    );
  });
});

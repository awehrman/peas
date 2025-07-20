import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { BaseWorker } from "../../base-worker";
import { ActionFactory } from "../../action-factory";
import type { BaseWorkerDependencies, BaseJobData } from "../../../types";
import type { IServiceContainer } from "../../../../services/container";

// Mock dependencies
const mockQueue = {
  name: "test-queue",
} as Queue;

const mockDependencies: BaseWorkerDependencies = {
  logger: {
    log: vi.fn(),
  },
  addStatusEventAndBroadcast: vi.fn(),
  ErrorHandler: {
    withErrorHandling: vi.fn(),
  },
};

const mockContainer = {
  logger: mockDependencies.logger,
  statusBroadcaster: {
    addStatusEventAndBroadcast: vi.fn(),
  },
  errorHandler: {
    errorHandler: mockDependencies.ErrorHandler,
  },
} as unknown as IServiceContainer;

// Test implementation of BaseWorker
class TestWorker extends BaseWorker<BaseJobData, BaseWorkerDependencies> {
  protected registerActions(): void {
    // No actions to register for this test
  }

  protected getOperationName(): string {
    return "test-worker";
  }
}

describe("BaseWorker Constructor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with required dependencies", () => {
      const worker = new TestWorker(mockQueue, mockDependencies);

      expect(worker).toBeInstanceOf(BaseWorker);
      expect(worker["dependencies"]).toBe(mockDependencies);
      expect(worker["actionFactory"]).toBeDefined();
      expect(worker["container"]).toBeUndefined();
    });

    it("should initialize with custom action factory", () => {
      const customActionFactory = new ActionFactory();
      const worker = new TestWorker(
        mockQueue,
        mockDependencies,
        customActionFactory
      );

      expect(worker["actionFactory"]).toBe(customActionFactory);
    });

    it("should initialize with container", () => {
      const worker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        mockContainer
      );

      expect(worker["container"]).toBe(mockContainer);
    });

    it("should call registerActions during initialization", () => {
      const registerActionsSpy = vi.spyOn(
        TestWorker.prototype as unknown as { registerActions: () => void },
        "registerActions"
      );

      new TestWorker(mockQueue, mockDependencies);

      expect(registerActionsSpy).toHaveBeenCalledOnce();
    });

    it("should create worker during initialization", () => {
      const createWorkerSpy = vi.spyOn(
        TestWorker.prototype as unknown as {
          createWorker: (queue: unknown) => void;
        },
        "createWorker"
      );

      new TestWorker(mockQueue, mockDependencies);

      expect(createWorkerSpy).toHaveBeenCalledWith(mockQueue);
    });
  });

  describe("validateDependencies", () => {
    it("should not throw error by default", () => {
      const worker = new TestWorker(mockQueue, mockDependencies);

      expect(() => worker.validateDependencies()).not.toThrow();
    });
  });

  describe("getOperationName", () => {
    it("should return the operation name", () => {
      const worker = new TestWorker(mockQueue, mockDependencies);

      expect(worker["getOperationName"]()).toBe("test-worker");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { BaseWorker } from "../../base-worker";
import type { BaseWorkerDependencies, BaseJobData } from "../../../types";
import type { IServiceContainer } from "../../../../services/container";
import type { NoteStatus } from "@peas/database";

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

describe("BaseWorker Dependencies", () => {
  let worker: TestWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new TestWorker(
      mockQueue,
      mockDependencies,
      undefined,
      mockContainer
    );
  });

  describe("createStatusBroadcaster", () => {
    it("should create status broadcaster function", () => {
      const broadcaster = worker["createStatusBroadcaster"]();

      expect(typeof broadcaster).toBe("function");
    });

    it("should call container status broadcaster when available", async () => {
      const mockAddStatusEvent = vi.fn().mockResolvedValue(undefined);
      const containerWithBroadcaster = {
        ...mockContainer,
        statusBroadcaster: {
          addStatusEventAndBroadcast: mockAddStatusEvent,
        },
      } as unknown as IServiceContainer;

      const testWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        containerWithBroadcaster
      );
      const broadcaster = testWorker["createStatusBroadcaster"]();

      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "processing" as NoteStatus,
        message: "Test message",
      };

      await broadcaster(event);

      expect(mockAddStatusEvent).toHaveBeenCalledWith(event);
    });

    it("should return resolved promise when container not available", async () => {
      const workerWithoutContainer = new TestWorker(
        mockQueue,
        mockDependencies
      );

      expect(() => workerWithoutContainer["createStatusBroadcaster"]()).toThrow(
        "Container not available for status broadcaster"
      );
    });

    it("should return resolved promise when status broadcaster not available", async () => {
      const containerWithoutBroadcaster = {
        ...mockContainer,
        statusBroadcaster: undefined,
      } as unknown as IServiceContainer;

      const testWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        containerWithoutBroadcaster
      );
      const broadcaster = testWorker["createStatusBroadcaster"]();

      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "processing" as NoteStatus,
        message: "Test message",
      };

      const result = await broadcaster(event);
      expect(result).toBeUndefined();
    });
  });

  describe("createErrorHandler", () => {
    it("should return container error handler when available", () => {
      const errorHandler = worker["createErrorHandler"]();

      expect(errorHandler).toBe(mockDependencies.ErrorHandler);
    });

    it("should throw error when container not available", () => {
      const workerWithoutContainer = new TestWorker(
        mockQueue,
        mockDependencies
      );

      expect(() => workerWithoutContainer["createErrorHandler"]()).toThrow(
        "Container not available for error handler"
      );
    });

    it("should return default error handler when container error handler not available", () => {
      const containerWithoutErrorHandler = {
        ...mockContainer,
        errorHandler: undefined,
      } as unknown as IServiceContainer;

      const testWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        containerWithoutErrorHandler
      );
      const errorHandler = testWorker["createErrorHandler"]();

      expect(errorHandler).toEqual({
        withErrorHandling: expect.any(Function),
      });
    });
  });

  describe("createLogger", () => {
    it("should return container logger when available", () => {
      const logger = worker["createLogger"]();

      expect(logger).toBe(mockDependencies.logger);
    });

    it("should throw error when container not available", () => {
      const workerWithoutContainer = new TestWorker(
        mockQueue,
        mockDependencies
      );

      expect(() => workerWithoutContainer["createLogger"]()).toThrow(
        "Container not available for logger"
      );
    });
  });

  describe("createBaseDependencies", () => {
    it("should create base dependencies with all required properties", () => {
      const baseDeps = worker.createBaseDependencies();

      expect(baseDeps).toHaveProperty("addStatusEventAndBroadcast");
      expect(baseDeps).toHaveProperty("ErrorHandler");
      expect(baseDeps).toHaveProperty("logger");
      expect(typeof baseDeps.addStatusEventAndBroadcast).toBe("function");
      expect(typeof baseDeps.ErrorHandler.withErrorHandling).toBe("function");
      expect(baseDeps.logger).toBe(mockDependencies.logger);
    });

    it("should create status broadcaster function", async () => {
      const baseDeps = worker.createBaseDependencies();

      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "processing" as NoteStatus,
        message: "Test message",
      };

      await expect(
        baseDeps.addStatusEventAndBroadcast(event)
      ).resolves.toBeUndefined();
    });
  });
});

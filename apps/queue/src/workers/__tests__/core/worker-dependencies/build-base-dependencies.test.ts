/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../services/container";
import { LogLevel } from "../../../../types";
import { buildBaseDependencies } from "../../../core/worker-dependencies/build-base-dependencies";

describe("buildBaseDependencies", () => {
  let mockContainer: IServiceContainer;

  beforeEach(() => {
    mockContainer = {
      logger: {
        log: vi.fn(),
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      queues: {
        noteQueue: { name: "note" } as any,
        imageQueue: { name: "image" } as any,
        ingredientQueue: { name: "ingredient" } as any,
        instructionQueue: { name: "instruction" } as any,
        categorizationQueue: { name: "categorization" } as any,
        sourceQueue: { name: "source" } as any,
      },
      cache: {} as any,
      database: {} as any,
      healthMonitor: {} as any,
      webSocket: {} as any,
      config: {} as any,
      close: vi.fn(),
    } as IServiceContainer;
  });

  describe("logger dependency", () => {
    it("should build logger dependency with log method", () => {
      const deps = buildBaseDependencies(mockContainer);

      expect(deps.logger).toBeDefined();
      expect(typeof deps.logger.log).toBe("function");
    });

    it("should delegate log calls to container logger", () => {
      const deps = buildBaseDependencies(mockContainer);
      const testMessage = "test message";
      const testLevel = LogLevel.INFO;
      const testMeta = { key: "value" };

      deps.logger.log(testMessage, testLevel, testMeta);

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        testMessage,
        testLevel,
        testMeta
      );
    });

    it("should handle log calls without optional parameters", () => {
      const deps = buildBaseDependencies(mockContainer);
      const testMessage = "test message";

      deps.logger.log(testMessage);

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        testMessage,
        undefined,
        undefined
      );
    });
  });

  describe("errorHandler dependency", () => {
    it("should build errorHandler dependency with all required methods", () => {
      const deps = buildBaseDependencies(mockContainer);

      expect(deps.errorHandler).toBeDefined();
      expect(typeof deps.errorHandler!.withErrorHandling).toBe("function");
      expect(typeof deps.errorHandler!.createJobError).toBe("function");
      expect(typeof deps.errorHandler!.classifyError).toBe("function");
      expect(typeof deps.errorHandler!.logError).toBe("function");
    });

    describe("withErrorHandling", () => {
      it("should delegate withErrorHandling calls to container errorHandler", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testOperation = vi.fn().mockResolvedValue("test result");
        const testContext = { operation: "test-op", jobId: "test-job" };

        await deps.errorHandler!.withErrorHandling(testOperation, testContext);

        expect(
          mockContainer.errorHandler.withErrorHandling
        ).toHaveBeenCalledWith(
          testOperation,
          expect.objectContaining({
            operation: "test-op",
            jobId: "test-job",
            timestamp: expect.any(Date),
          })
        );
      });

      it("should use default operation name when not provided", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testOperation = vi.fn().mockResolvedValue("test result");
        const testContext = { jobId: "test-job" };

        await deps.errorHandler!.withErrorHandling(testOperation, testContext);

        expect(
          mockContainer.errorHandler.withErrorHandling
        ).toHaveBeenCalledWith(
          testOperation,
          expect.objectContaining({
            operation: "unknown",
            jobId: "test-job",
            timestamp: expect.any(Date),
          })
        );
      });

      it("should handle context with operation as non-string", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testOperation = vi.fn().mockResolvedValue("test result");
        const testContext = { operation: 123, jobId: "test-job" };

        await deps.errorHandler!.withErrorHandling(testOperation, testContext);

        expect(
          mockContainer.errorHandler.withErrorHandling
        ).toHaveBeenCalledWith(
          testOperation,
          expect.objectContaining({
            operation: 123, // The implementation uses || so it keeps the original value
            jobId: "test-job",
            timestamp: expect.any(Date),
          })
        );
      });

      it("should preserve all context properties", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testOperation = vi.fn().mockResolvedValue("test result");
        const testContext = {
          operation: "test-op",
          jobId: "test-job",
          customProp: "custom-value",
          nested: { key: "value" },
        };

        await deps.errorHandler!.withErrorHandling(testOperation, testContext);

        expect(
          mockContainer.errorHandler.withErrorHandling
        ).toHaveBeenCalledWith(
          testOperation,
          expect.objectContaining({
            operation: "test-op",
            jobId: "test-job",
            customProp: "custom-value",
            nested: { key: "value" },
            timestamp: expect.any(Date),
          })
        );
      });
    });

    describe("createJobError", () => {
      it("should delegate createJobError calls to container errorHandler", () => {
        const deps = buildBaseDependencies(mockContainer);
        const testError = new Error("test error");
        const testContext = { operation: "test-op", jobId: "test-job" };

        deps.errorHandler!.createJobError(testError, testContext);

        expect(mockContainer.errorHandler.createJobError).toHaveBeenCalledWith(
          testError,
          expect.objectContaining({
            operation: "test-op",
            jobId: "test-job",
            timestamp: expect.any(Date),
          })
        );
      });

      it("should use default operation name when not provided", () => {
        const deps = buildBaseDependencies(mockContainer);
        const testError = new Error("test error");
        const testContext = { jobId: "test-job" };

        deps.errorHandler!.createJobError(testError, testContext);

        expect(mockContainer.errorHandler.createJobError).toHaveBeenCalledWith(
          testError,
          expect.objectContaining({
            operation: "unknown",
            jobId: "test-job",
            timestamp: expect.any(Date),
          })
        );
      });
    });

    describe("classifyError", () => {
      it("should delegate classifyError calls to container errorHandler", () => {
        const deps = buildBaseDependencies(mockContainer);
        const testError = new Error("test error");

        deps.errorHandler!.classifyError(testError);

        expect(mockContainer.errorHandler.classifyError).toHaveBeenCalledWith(
          testError
        );
      });
    });

    describe("logError", () => {
      it("should delegate logError calls to container errorHandler", () => {
        const deps = buildBaseDependencies(mockContainer);
        const testError = new Error("test error");
        const testContext = { operation: "test-op", jobId: "test-job" };

        deps.errorHandler!.logError(testError, testContext);

        expect(mockContainer.errorHandler.logError).toHaveBeenCalledWith(
          testError,
          expect.objectContaining({
            operation: "test-op",
            jobId: "test-job",
            timestamp: expect.any(Date),
          })
        );
      });

      it("should use default operation name when not provided", () => {
        const deps = buildBaseDependencies(mockContainer);
        const testError = new Error("test error");
        const testContext = { jobId: "test-job" };

        deps.errorHandler!.logError(testError, testContext);

        expect(mockContainer.errorHandler.logError).toHaveBeenCalledWith(
          testError,
          expect.objectContaining({
            operation: "unknown",
            jobId: "test-job",
            timestamp: expect.any(Date),
          })
        );
      });
    });
  });

  describe("statusBroadcaster dependency", () => {
    it("should build statusBroadcaster dependency with addStatusEventAndBroadcast method", () => {
      const deps = buildBaseDependencies(mockContainer);

      expect(deps.statusBroadcaster).toBeDefined();
      expect(typeof deps.statusBroadcaster!.addStatusEventAndBroadcast).toBe(
        "function"
      );
    });

    describe("addStatusEventAndBroadcast", () => {
      it("should delegate addStatusEventAndBroadcast calls to container statusBroadcaster", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testEvent = {
          importId: "test-import",
          noteId: "test-note",
          status: "test-status",
          message: "Test message",
          context: "test-context",
          indentLevel: 1,
          metadata: { key: "value" },
        };

        await deps.statusBroadcaster!.addStatusEventAndBroadcast(testEvent);

        expect(
          mockContainer.statusBroadcaster.addStatusEventAndBroadcast
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            importId: "test-import",
            noteId: "test-note",
            status: "test-status",
            message: "Test message",
            context: "test-context",
            indentLevel: 1,
            metadata: { key: "value" },
            type: "status",
            severity: "info",
          })
        );
      });

      it("should use default values when not provided", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testEvent = {
          importId: "test-import",
          status: "test-status",
          message: "Test message",
        };

        await deps.statusBroadcaster!.addStatusEventAndBroadcast(testEvent);

        expect(
          mockContainer.statusBroadcaster.addStatusEventAndBroadcast
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            importId: "test-import",
            status: "test-status",
            message: "Test message",
            type: "status",
            severity: "info",
          })
        );
      });

      it("should preserve all event properties", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testEvent = {
          importId: "test-import",
          noteId: "test-note",
          status: "test-status",
          message: "Test message",
          context: "test-context",
          indentLevel: 2,
          metadata: { custom: "value", nested: { key: "value" } },
        };

        await deps.statusBroadcaster!.addStatusEventAndBroadcast(testEvent);

        expect(
          mockContainer.statusBroadcaster.addStatusEventAndBroadcast
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            importId: "test-import",
            noteId: "test-note",
            status: "test-status",
            message: "Test message",
            context: "test-context",
            indentLevel: 2,
            metadata: { custom: "value", nested: { key: "value" } },
            type: "status",
            severity: "info",
          })
        );
      });

      it("should handle events with minimal properties", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testEvent = {
          importId: "test-import",
          status: "test-status",
        };

        await deps.statusBroadcaster!.addStatusEventAndBroadcast(testEvent);

        expect(
          mockContainer.statusBroadcaster.addStatusEventAndBroadcast
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            importId: "test-import",
            status: "test-status",
            message: "",
            type: "status",
            severity: "info",
          })
        );
      });

      it("should handle events with custom metadata", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testEvent = {
          importId: "test-import",
          status: "test-status",
          metadata: { customKey: "customValue" },
        };

        await deps.statusBroadcaster!.addStatusEventAndBroadcast(testEvent);

        expect(
          mockContainer.statusBroadcaster.addStatusEventAndBroadcast
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            importId: "test-import",
            status: "test-status",
            metadata: { customKey: "customValue" },
            message: "",
            type: "status",
            severity: "info",
          })
        );
      });

      it("should handle events with high indent level", async () => {
        const deps = buildBaseDependencies(mockContainer);
        const testEvent = {
          importId: "test-import",
          status: "test-status",
          indentLevel: 5,
        };

        await deps.statusBroadcaster!.addStatusEventAndBroadcast(testEvent);

        expect(
          mockContainer.statusBroadcaster.addStatusEventAndBroadcast
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            importId: "test-import",
            status: "test-status",
            indentLevel: 5,
            message: "",
            type: "status",
            severity: "info",
          })
        );
      });
    });
  });

  describe("queues dependency", () => {
    it("should build queues dependency with all queue references", () => {
      const deps = buildBaseDependencies(mockContainer);

      expect(deps.queues).toBeDefined();
      expect(deps.queues!.noteQueue).toBe(mockContainer.queues.noteQueue);
      expect(deps.queues!.imageQueue).toBe(mockContainer.queues.imageQueue);
      expect(deps.queues!.ingredientQueue).toBe(
        mockContainer.queues.ingredientQueue
      );
      expect(deps.queues!.instructionQueue).toBe(
        mockContainer.queues.instructionQueue
      );
      expect(deps.queues!.categorizationQueue).toBe(
        mockContainer.queues.categorizationQueue
      );
      expect(deps.queues!.sourceQueue).toBe(mockContainer.queues.sourceQueue);
    });
  });
});

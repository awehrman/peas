/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../services/container";
import { buildErrorHandlerDependency } from "../../../core/worker-dependencies/build-error-handler-dependency";

describe("buildErrorHandlerDependency", () => {
  let mockContainer: IServiceContainer;

  beforeEach(() => {
    mockContainer = {
      errorHandler: {
        withErrorHandling: vi.fn() as any,
        createJobError: vi.fn() as any,
        classifyError: vi.fn() as any,
        logError: vi.fn() as any,
      },
    } as unknown as IServiceContainer;
  });

  describe("withErrorHandling", () => {
    it("should delegate withErrorHandling calls to container errorHandler", async () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testOperation = vi.fn().mockResolvedValue("test result");
      const testContext = { operation: "test-op", jobId: "test-job" };

      await errorHandler.withErrorHandling(testOperation, testContext);

      expect(mockContainer.errorHandler.withErrorHandling).toHaveBeenCalledWith(
        testOperation,
        expect.objectContaining({
          operation: "test-op",
          jobId: "test-job",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should use default operation name when context is undefined", async () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testOperation = vi.fn().mockResolvedValue("test result");

      await errorHandler.withErrorHandling(testOperation);

      expect(mockContainer.errorHandler.withErrorHandling).toHaveBeenCalledWith(
        testOperation,
        expect.objectContaining({
          operation: "unknown",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should use default operation name when context has no operation", async () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testOperation = vi.fn().mockResolvedValue("test result");
      const testContext = { jobId: "test-job" };

      await errorHandler.withErrorHandling(testOperation, testContext);

      expect(mockContainer.errorHandler.withErrorHandling).toHaveBeenCalledWith(
        testOperation,
        expect.objectContaining({
          operation: "unknown",
          jobId: "test-job",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should preserve all context properties", async () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testOperation = vi.fn().mockResolvedValue("test result");
      const testContext = {
        operation: "test-op",
        jobId: "test-job",
        customProp: "custom-value",
        nested: { key: "value" },
      };

      await errorHandler.withErrorHandling(testOperation, testContext);

      expect(mockContainer.errorHandler.withErrorHandling).toHaveBeenCalledWith(
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

    it("should handle operation that throws error", async () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");
      const testOperation = vi.fn().mockRejectedValue(testError);
      const testContext = { operation: "test-op" };

      (mockContainer.errorHandler.withErrorHandling as any).mockRejectedValue(
        testError
      );

      await expect(
        errorHandler.withErrorHandling(testOperation, testContext)
      ).rejects.toThrow("test error");

      expect(mockContainer.errorHandler.withErrorHandling).toHaveBeenCalledWith(
        testOperation,
        expect.objectContaining({
          operation: "test-op",
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe("createJobError", () => {
    it("should delegate createJobError calls to container errorHandler", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");
      const testContext = { operation: "test-op", jobId: "test-job" };

      errorHandler.createJobError(testError, testContext);

      expect(mockContainer.errorHandler.createJobError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          operation: "test-op",
          jobId: "test-job",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should use default operation name when context is undefined", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");

      errorHandler.createJobError(testError);

      expect(mockContainer.errorHandler.createJobError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          operation: "unknown",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should use default operation name when context has no operation", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");
      const testContext = { jobId: "test-job" };

      errorHandler.createJobError(testError, testContext);

      expect(mockContainer.errorHandler.createJobError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          operation: "unknown",
          jobId: "test-job",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should preserve all context properties", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");
      const testContext = {
        operation: "test-op",
        jobId: "test-job",
        customProp: "custom-value",
        nested: { key: "value" },
      };

      errorHandler.createJobError(testError, testContext);

      expect(mockContainer.errorHandler.createJobError).toHaveBeenCalledWith(
        testError,
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

  describe("classifyError", () => {
    it("should delegate classifyError calls to container errorHandler", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");

      errorHandler.classifyError(testError);

      expect(mockContainer.errorHandler.classifyError).toHaveBeenCalledWith(
        testError
      );
    });

    it("should return classification result", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");
      const expectedClassification = "VALIDATION_ERROR";

      (mockContainer.errorHandler.classifyError as any).mockReturnValue(
        expectedClassification
      );

      const result = errorHandler.classifyError(testError);

      expect(result).toBe(expectedClassification);
      expect(mockContainer.errorHandler.classifyError).toHaveBeenCalledWith(
        testError
      );
    });
  });

  describe("logError", () => {
    it("should delegate logError calls to container errorHandler", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");
      const testContext = { operation: "test-op", jobId: "test-job" };

      errorHandler.logError(testError, testContext);

      expect(mockContainer.errorHandler.logError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          operation: "test-op",
          jobId: "test-job",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should use default operation name when context is undefined", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");

      errorHandler.logError(testError);

      expect(mockContainer.errorHandler.logError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          operation: "unknown",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should use default operation name when context has no operation", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");
      const testContext = { jobId: "test-job" };

      errorHandler.logError(testError, testContext);

      expect(mockContainer.errorHandler.logError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          operation: "unknown",
          jobId: "test-job",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should preserve all context properties", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testError = new Error("test error");
      const testContext = {
        operation: "test-op",
        jobId: "test-job",
        customProp: "custom-value",
        nested: { key: "value" },
      };

      errorHandler.logError(testError, testContext);

      expect(mockContainer.errorHandler.logError).toHaveBeenCalledWith(
        testError,
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

  describe("complete error handler structure", () => {
    it("should return complete error handler with all required methods", () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);

      expect(errorHandler).toEqual({
        withErrorHandling: expect.any(Function),
        createJobError: expect.any(Function),
        classifyError: expect.any(Function),
        logError: expect.any(Function),
      });
    });

    it("should create new instances on each call", () => {
      const errorHandler1 = buildErrorHandlerDependency(mockContainer);
      const errorHandler2 = buildErrorHandlerDependency(mockContainer);

      expect(errorHandler1).not.toBe(errorHandler2);
      expect(errorHandler1.withErrorHandling).not.toBe(
        errorHandler2.withErrorHandling
      );
      expect(errorHandler1.createJobError).not.toBe(
        errorHandler2.createJobError
      );
      expect(errorHandler1.classifyError).not.toBe(errorHandler2.classifyError);
      expect(errorHandler1.logError).not.toBe(errorHandler2.logError);
    });
  });

  describe("timestamp generation", () => {
    it("should generate timestamps for each call", async () => {
      const errorHandler = buildErrorHandlerDependency(mockContainer);
      const testOperation = vi.fn().mockResolvedValue("test result");
      const testContext = { operation: "test-op" };

      const timestamps: Date[] = [];

      // Mock the container method to capture timestamps
      (mockContainer.errorHandler.withErrorHandling as any).mockImplementation(
        (operation: any, context: any) => {
          timestamps.push(context.timestamp);
          return operation();
        }
      );

      await errorHandler.withErrorHandling(testOperation, testContext);
      await errorHandler.withErrorHandling(testOperation, testContext);
      await errorHandler.withErrorHandling(testOperation, testContext);

      expect(timestamps).toHaveLength(3);
      expect(timestamps[0]).toBeInstanceOf(Date);
      expect(timestamps[1]).toBeInstanceOf(Date);
      expect(timestamps[2]).toBeInstanceOf(Date);
      // Note: Timestamps might be the same if called very quickly, which is acceptable
    });
  });
});

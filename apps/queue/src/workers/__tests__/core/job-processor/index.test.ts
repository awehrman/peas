import { describe, expect, it, vi } from "vitest";

import { createMockLogger } from "../../../../test-utils/helpers";
import * as JobProcessorModule from "../../../core/job-processor";

describe("Job Processor Module Exports", () => {
  describe("processJob function", () => {
    it("should export processJob function", () => {
      expect(JobProcessorModule.processJob).toBeDefined();
      expect(typeof JobProcessorModule.processJob).toBe("function");
    });

    it("should be an async function", () => {
      expect(JobProcessorModule.processJob.constructor.name).toBe(
        "AsyncFunction"
      );
    });

    it("should have the correct function signature", () => {
      const processJob = JobProcessorModule.processJob;

      // Check that it's a function that can be called
      expect(typeof processJob).toBe("function");

      // Check that it returns a Promise
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };
      const result = processJob(
        [],
        "test",
        mockContext,
        mockLogger,
        () => "test",
        {}
      );
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("module structure", () => {
    it("should export exactly 1 function", () => {
      const exportedKeys = Object.keys(JobProcessorModule);
      expect(exportedKeys).toHaveLength(1);
    });

    it("should export the expected function", () => {
      expect(JobProcessorModule).toHaveProperty("processJob");
    });

    it("should not export unexpected properties", () => {
      const exportedKeys = Object.keys(JobProcessorModule);
      const expectedKeys = ["processJob"];

      expect(exportedKeys.sort()).toEqual(expectedKeys.sort());
    });
  });

  describe("function properties", () => {
    it("should have correct function name", () => {
      expect(JobProcessorModule.processJob.name).toBe("processJob");
    });

    it("should have function length (parameter count)", () => {
      expect(JobProcessorModule.processJob.length).toBe(6);
    });
  });

  describe("module import patterns", () => {
    it("should work with default import", async () => {
      const { processJob } = JobProcessorModule;

      expect(processJob).toBeDefined();
      expect(typeof processJob).toBe("function");

      // Test that it can be called
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };
      const result = processJob(
        [],
        "test",
        mockContext,
        mockLogger,
        () => "test",
        {}
      );
      expect(result).toBeInstanceOf(Promise);
    });

    it("should work with namespace import", () => {
      expect(JobProcessorModule.processJob).toBeDefined();
      expect(typeof JobProcessorModule.processJob).toBe("function");
    });

    it("should maintain function reference equality", () => {
      const { processJob } = JobProcessorModule;
      expect(processJob).toBe(JobProcessorModule.processJob);
    });
  });

  describe("function behavior", () => {
    it("should handle empty actions array", async () => {
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };

      const result = await JobProcessorModule.processJob(
        [],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        {}
      );

      expect(result).toBe("initial-data");
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 0 actions: "
      );
    });

    it("should handle single action execution", async () => {
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };
      const mockAction = {
        name: "test-action",
        execute: vi.fn().mockResolvedValue("processed-data"),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: "processed-data",
          duration: 100,
        }),
      };

      const result = await JobProcessorModule.processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        {}
      );

      expect(result).toBe("processed-data");
      expect(mockAction.execute).toHaveBeenCalledWith(
        "initial-data",
        {},
        mockContext
      );
    });
  });

  describe("error handling", () => {
    it("should propagate errors from action execution", async () => {
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };
      const testError = new Error("Action execution failed");
      const mockAction = {
        name: "failing-action",
        execute: vi.fn().mockRejectedValue(testError),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: false,
          error: testError,
          duration: 100,
        }),
      };

      await expect(
        JobProcessorModule.processJob(
          [mockAction],
          "initial-data",
          mockContext,
          mockLogger,
          () => "test-operation",
          {}
        )
      ).rejects.toThrow("Action execution failed");
    });
  });

  describe("logging functionality", () => {
    it("should log action execution progress", async () => {
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };
      const mockAction = {
        name: "test-action",
        execute: vi.fn().mockResolvedValue("processed-data"),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: "processed-data",
          duration: 100,
        }),
      };

      await JobProcessorModule.processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        {}
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 1 actions: test-action"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[TEST-OPERATION\] ✅ test-action \(\d+ms\)/)
      );
    });

    it("should handle operation name function", async () => {
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };
      const mockAction = {
        name: "test-action",
        execute: vi.fn().mockResolvedValue("processed-data"),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: "processed-data",
          duration: 100,
        }),
      };

      const getOperationName = () => "custom-operation";

      await JobProcessorModule.processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        getOperationName,
        {}
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CUSTOM-OPERATION] Executing 1 actions: test-action"
      );
    });
  });

  describe("data flow", () => {
    it("should pass data between actions", async () => {
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };
      const mockAction1 = {
        name: "action-1",
        execute: vi.fn().mockResolvedValue("data-1"),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: "data-1",
          duration: 50,
        }),
      };
      const mockAction2 = {
        name: "action-2",
        execute: vi.fn().mockResolvedValue("data-2"),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: "data-2",
          duration: 75,
        }),
      };

      const result = await JobProcessorModule.processJob(
        [mockAction1, mockAction2],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        {}
      );

      expect(result).toBe("data-2");
      expect(mockAction1.execute).toHaveBeenCalledWith(
        "initial-data",
        {},
        mockContext
      );
      expect(mockAction2.execute).toHaveBeenCalledWith(
        "data-1",
        {},
        mockContext
      );
    });
  });

  describe("dependencies injection", () => {
    it("should pass dependencies to actions", async () => {
      const mockLogger = createMockLogger();
      const mockContext = {
        jobId: "test",
        retryCount: 0,
        queueName: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };
      const dependencies = { testDep: "test-value" };
      const mockAction = {
        name: "test-action",
        execute: vi.fn().mockResolvedValue("processed-data"),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: "processed-data",
          duration: 100,
        }),
      };

      await JobProcessorModule.processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        dependencies
      );

      expect(mockAction.execute).toHaveBeenCalledWith(
        "initial-data",
        dependencies,
        mockContext
      );
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockActionContext,
  createMockLogger,
} from "../../../../test-utils/helpers";
import { processJob } from "../../../core/job-processor/job-processor";
import type { ActionContext, WorkerAction } from "../../../core/types";

describe("processJob", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockContext: ActionContext;
  let mockDependencies: { testDep: string };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockContext = createMockActionContext();
    mockDependencies = { testDep: "test-value" };
  });

  describe("basic functionality", () => {
    it("should execute a single action successfully", async () => {
      const mockAction: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "test-action",
          execute: vi.fn().mockResolvedValue("processed-data"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "processed-data",
            duration: 100,
          }),
        };

      const result = await processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(result).toBe("processed-data");
      expect(mockAction.execute).toHaveBeenCalledWith(
        "initial-data",
        mockDependencies,
        mockContext
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 1 actions: test-action"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[TEST-OPERATION\] ✅ test-action \(\d+ms\)/)
      );
    });

    it("should execute multiple actions in sequence", async () => {
      const mockAction1: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "action-1",
          execute: vi.fn().mockResolvedValue("data-1"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-1",
            duration: 50,
          }),
        };

      const mockAction2: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "action-2",
          execute: vi.fn().mockResolvedValue("data-2"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-2",
            duration: 75,
          }),
        };

      const result = await processJob(
        [mockAction1, mockAction2],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(result).toBe("data-2");
      expect(mockAction1.execute).toHaveBeenCalledWith(
        "initial-data",
        mockDependencies,
        mockContext
      );
      expect(mockAction2.execute).toHaveBeenCalledWith(
        "data-1",
        mockDependencies,
        mockContext
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 2 actions: action-1, action-2"
      );
    });

    it("should handle empty actions array", async () => {
      const result = await processJob(
        [],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(result).toBe("initial-data");
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 0 actions: "
      );
    });
  });

  describe("action name extraction", () => {
    it("should extract action name from error_handling_wrapper", async () => {
      const mockAction: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "error_handling_wrapper(parse-action)",
          execute: vi.fn().mockResolvedValue("processed-data"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "processed-data",
            duration: 100,
          }),
        };

      await processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 1 actions: parse-action"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[TEST-OPERATION\] ✅ parse-action \(\d+ms\)/)
      );
    });

    it("should extract action name from retry_wrapper", async () => {
      const mockAction: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "retry_wrapper(validate-action)",
          execute: vi.fn().mockResolvedValue("processed-data"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "processed-data",
            duration: 100,
          }),
        };

      await processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 1 actions: validate-action"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[TEST-OPERATION\] ✅ validate-action \(\d+ms\)/)
      );
    });

    it("should handle multiple wrapper types in sequence", async () => {
      const mockAction1: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "error_handling_wrapper(parse-action)",
          execute: vi.fn().mockResolvedValue("data-1"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-1",
            duration: 50,
          }),
        };

      const mockAction2: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "retry_wrapper(validate-action)",
          execute: vi.fn().mockResolvedValue("data-2"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-2",
            duration: 75,
          }),
        };

      await processJob(
        [mockAction1, mockAction2],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 2 actions: parse-action, validate-action"
      );
    });

    it("should handle action names without wrappers", async () => {
      const mockAction: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "simple-action",
          execute: vi.fn().mockResolvedValue("processed-data"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "processed-data",
            duration: 100,
          }),
        };

      await processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 1 actions: simple-action"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[TEST-OPERATION\] ✅ simple-action \(\d+ms\)/)
      );
    });
  });

  describe("data flow", () => {
    it("should pass data between actions correctly", async () => {
      const mockAction1: WorkerAction<string, typeof mockDependencies, number> =
        {
          name: "action-1",
          execute: vi.fn().mockResolvedValue(42),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: 42,
            duration: 50,
          }),
        };

      const mockAction2: WorkerAction<
        number,
        typeof mockDependencies,
        boolean
      > = {
        name: "action-2",
        execute: vi.fn().mockResolvedValue(true),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: true,
          duration: 75,
        }),
      };

      const result = await processJob(
        [mockAction1, mockAction2] as WorkerAction<
          unknown,
          typeof mockDependencies,
          unknown
        >[],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(result).toBe(true);
      expect(mockAction1.execute).toHaveBeenCalledWith(
        "initial-data",
        mockDependencies,
        mockContext
      );
      expect(mockAction2.execute).toHaveBeenCalledWith(
        42,
        mockDependencies,
        mockContext
      );
    });

    it("should handle complex data objects", async () => {
      const initialData = { id: "123", name: "test", value: 0 };
      const processedData = {
        id: "123",
        name: "test",
        value: 42,
        processed: true,
      };

      const mockAction: WorkerAction<
        typeof initialData,
        typeof mockDependencies,
        typeof processedData
      > = {
        name: "complex-action",
        execute: vi.fn().mockResolvedValue(processedData),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: processedData,
          duration: 100,
        }),
      };

      const result = await processJob(
        [mockAction],
        initialData,
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(result).toEqual(processedData);
      expect(mockAction.execute).toHaveBeenCalledWith(
        initialData,
        mockDependencies,
        mockContext
      );
    });
  });

  describe("logging and timing", () => {
    it("should log execution start with correct action count", async () => {
      const mockAction1: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "action-1",
          execute: vi.fn().mockResolvedValue("data-1"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-1",
            duration: 50,
          }),
        };

      const mockAction2: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "action-2",
          execute: vi.fn().mockResolvedValue("data-2"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-2",
            duration: 75,
          }),
        };

      const mockAction3: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "action-3",
          execute: vi.fn().mockResolvedValue("data-3"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-3",
            duration: 100,
          }),
        };

      await processJob(
        [mockAction1, mockAction2, mockAction3],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Executing 3 actions: action-1, action-2, action-3"
      );
    });

    it("should log timing information for each action", async () => {
      const mockAction: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "timed-action",
          execute: vi.fn().mockResolvedValue("processed-data"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "processed-data",
            duration: 100,
          }),
        };

      await processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      const logCalls = mockLogger.log.mock.calls;
      const timingLog = logCalls.find(
        (call) => call[0].includes("✅ timed-action") && call[0].includes("ms")
      );

      expect(timingLog).toBeDefined();
      expect(timingLog![0]).toMatch(
        /\[TEST-OPERATION\] ✅ timed-action \(\d+ms\)/
      );
    });

    it("should handle operation name function that returns different values", async () => {
      const mockAction: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "test-action",
          execute: vi.fn().mockResolvedValue("processed-data"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "processed-data",
            duration: 100,
          }),
        };

      const getOperationName = () => "custom-operation";

      await processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        getOperationName,
        mockDependencies
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CUSTOM-OPERATION] Executing 1 actions: test-action"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[CUSTOM-OPERATION\] ✅ test-action \(\d+ms\)/)
      );
    });
  });

  describe("error handling", () => {
    it("should propagate errors from action execution", async () => {
      const testError = new Error("Action execution failed");
      const mockAction: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "failing-action",
          execute: vi.fn().mockRejectedValue(testError),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: false,
            error: testError,
            duration: 100,
          }),
        };

      await expect(
        processJob(
          [mockAction],
          "initial-data",
          mockContext,
          mockLogger,
          () => "test-operation",
          mockDependencies
        )
      ).rejects.toThrow("Action execution failed");

      expect(mockAction.execute).toHaveBeenCalledWith(
        "initial-data",
        mockDependencies,
        mockContext
      );
    });

    it("should handle async errors properly", async () => {
      const mockAction: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "async-failing-action",
          execute: vi.fn().mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            throw new Error("Async error");
          }),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: false,
            error: new Error("Async error"),
            duration: 100,
          }),
        };

      await expect(
        processJob(
          [mockAction],
          "initial-data",
          mockContext,
          mockLogger,
          () => "test-operation",
          mockDependencies
        )
      ).rejects.toThrow("Async error");
    });
  });

  describe("dependencies injection", () => {
    it("should pass dependencies to all actions", async () => {
      const mockAction1: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "action-1",
          execute: vi.fn().mockResolvedValue("data-1"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-1",
            duration: 50,
          }),
        };

      const mockAction2: WorkerAction<string, typeof mockDependencies, string> =
        {
          name: "action-2",
          execute: vi.fn().mockResolvedValue("data-2"),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: "data-2",
            duration: 75,
          }),
        };

      await processJob(
        [mockAction1, mockAction2],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        mockDependencies
      );

      expect(mockAction1.execute).toHaveBeenCalledWith(
        "initial-data",
        mockDependencies,
        mockContext
      );
      expect(mockAction2.execute).toHaveBeenCalledWith(
        "data-1",
        mockDependencies,
        mockContext
      );
    });

    it("should handle complex dependencies", async () => {
      const complexDependencies = {
        logger: mockLogger,
        cache: { get: vi.fn(), set: vi.fn() },
        database: { query: vi.fn() },
        config: { timeout: 5000 },
      };

      const mockAction: WorkerAction<
        string,
        typeof complexDependencies,
        string
      > = {
        name: "complex-deps-action",
        execute: vi.fn().mockResolvedValue("processed-data"),
        executeWithTiming: vi.fn().mockResolvedValue({
          success: true,
          data: "processed-data",
          duration: 100,
        }),
      };

      await processJob(
        [mockAction],
        "initial-data",
        mockContext,
        mockLogger,
        () => "test-operation",
        complexDependencies
      );

      expect(mockAction.execute).toHaveBeenCalledWith(
        "initial-data",
        complexDependencies,
        mockContext
      );
    });
  });
});

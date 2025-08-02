import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockActionContext,
  createMockLogger,
} from "../../../test-utils/helpers";
import { ActionName } from "../../../types";
import {
  BaseAction,
  LoggingAction,
  NoOpAction,
  ValidationAction,
} from "../../core/base-action";
import type { ActionContext } from "../../core/types";
import type { BaseJobData } from "../../types";

// Mock console.error for testing
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("BaseAction", () => {
  let mockContext: ActionContext;
  let mockLogger: { log: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockActionContext();
    mockLogger = createMockLogger();
  });

  describe("executeWithTiming", () => {
    it("should execute action successfully and return success result", async () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return { ...data, metadata: { ...data.metadata, processed: true } };
        }
      }

      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData;

      const result = await action.executeWithTiming(testData, {}, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        jobId: "test-123",
        metadata: { processed: true },
      });
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it("should handle action execution error and return error result", async () => {
      class TestAction extends BaseAction {
        name = ActionName.VALIDATION;

        async execute(): Promise<BaseJobData> {
          throw new Error("Test error");
        }
      }

      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData;

      const result = await action.executeWithTiming(testData, {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Test error");
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.data).toBeUndefined();
    });

    it("should call custom onError handler when provided", async () => {
      const customErrorHandler = vi.fn();

      class TestAction extends BaseAction {
        name = ActionName.LOGGING;

        async execute(): Promise<BaseJobData> {
          throw new Error("Test error");
        }

        onError = customErrorHandler;
      }

      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData;

      await action.executeWithTiming(testData, {}, mockContext);

      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        testData,
        {},
        mockContext
      );
    });

    it("should log error when dependencies have logger", async () => {
      class TestAction extends BaseAction {
        name = ActionName.VALIDATION;

        async execute(): Promise<BaseJobData> {
          throw new Error("Test error");
        }
      }

      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData;
      const deps = { logger: mockLogger };

      await action.executeWithTiming(testData, deps, mockContext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Action validation failed for job test-job-id"),
        "error",
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it("should use console.error when no logger available", async () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(): Promise<BaseJobData> {
          throw new Error("Test error");
        }
      }

      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData;

      await action.executeWithTiming(testData, {}, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Action no_op failed for job test-job-id"),
        expect.stringContaining("Test error")
      );
    });

    it("should handle non-Error objects thrown", async () => {
      class TestAction extends BaseAction {
        name = ActionName.LOGGING;

        async execute(): Promise<BaseJobData> {
          throw "String error";
        }
      }

      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData;

      const result = await action.executeWithTiming(testData, {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // When a string is thrown, it gets cast to Error but message might be undefined
      expect(result.error?.message || result.error?.toString()).toContain(
        "String error"
      );
    });
  });

  describe("validateInput", () => {
    it("should return null by default (no validation)", () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return data;
        }
      }

      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData;

      const result = action.validateInput(testData);

      expect(result).toBeNull();
    });

    it("should allow subclasses to override validation", () => {
      class TestAction extends BaseAction {
        name = ActionName.VALIDATION;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return data;
        }

        validateInput(data: BaseJobData): Error | null {
          if (!data.jobId) {
            return new Error("Job ID is required");
          }
          return null;
        }
      }

      const action = new TestAction();

      // Test valid input
      const validData = { jobId: "test-123" } as BaseJobData;
      expect(action.validateInput(validData)).toBeNull();

      // Test invalid input
      const invalidData = {} as BaseJobData;
      const error = action.validateInput(invalidData);
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Job ID is required");
    });
  });

  describe("withConfig", () => {
    it("should create new action instance with custom configuration", () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return data;
        }
      }

      const action = new TestAction();
      const configuredAction = action.withConfig({
        retryable: false,
        priority: 10,
      });

      expect(configuredAction).not.toBe(action); // New instance
      expect(configuredAction.retryable).toBe(false);
      expect(configuredAction.priority).toBe(10);
      expect(configuredAction.name).toBe(ActionName.NO_OP);
    });

    it("should preserve original action properties when not overridden", () => {
      class TestAction extends BaseAction {
        name = ActionName.LOGGING;
        retryable = false;
        priority = 5;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return data;
        }
      }

      const action = new TestAction();
      const configuredAction = action.withConfig({ priority: 10 });

      expect(configuredAction.retryable).toBe(false); // Preserved
      expect(configuredAction.priority).toBe(10); // Overridden
      expect(configuredAction.name).toBe(ActionName.LOGGING); // Preserved
    });
  });

  describe("executeServiceAction", () => {
    it("should execute service action with default broadcasting", async () => {
      class TestAction extends BaseAction<
        BaseJobData,
        { logger: typeof mockLogger }
      > {
        name = ActionName.NO_OP;

        async execute(
          data: BaseJobData,
          deps: { logger: typeof mockLogger },
          context: ActionContext
        ): Promise<BaseJobData> {
          return this.executeServiceAction({
            data,
            deps,
            context,
            serviceCall: async () =>
              ({ ...data, processed: true }) as BaseJobData,
          }) as Promise<BaseJobData>;
        }
      }

      const action = new TestAction();
      const testData = {
        jobId: "test-123",
        importId: "import-456",
      } as BaseJobData;

      const result = await action.execute(
        testData,
        { logger: mockLogger },
        mockContext
      );

      expect(result).toEqual({
        jobId: "test-123",
        importId: "import-456",
        processed: true,
      });
    });

    it("should execute service action with custom context name and messages", async () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return this.executeServiceAction({
            data,
            deps: { logger: mockLogger },
            context: mockContext,
            serviceCall: async () =>
              ({ ...data, processed: true }) as BaseJobData,
            contextName: "Custom Context",
            startMessage: "Starting custom action",
            completionMessage: "Custom action completed",
          }) as Promise<BaseJobData>;
        }
      }

      const action = new TestAction();
      const testData = {
        jobId: "test-123",
        importId: "import-456",
      } as BaseJobData;

      const result = await action.execute(testData);

      expect(result).toEqual({
        jobId: "test-123",
        importId: "import-456",
        processed: true,
      });
    });

    it("should execute service action with additional broadcasting", async () => {
      const additionalBroadcasting = vi.fn().mockResolvedValue(undefined);
      const mockStatusBroadcaster = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      };

      class TestAction extends BaseAction<
        BaseJobData,
        {
          logger: typeof mockLogger;
          statusBroadcaster: typeof mockStatusBroadcaster;
        }
      > {
        name = ActionName.NO_OP;

        async execute(
          data: BaseJobData,
          deps: {
            logger: typeof mockLogger;
            statusBroadcaster: typeof mockStatusBroadcaster;
          },
          context: ActionContext
        ): Promise<BaseJobData> {
          return this.executeServiceAction({
            data,
            deps,
            context,
            serviceCall: async () =>
              ({ ...data, processed: true }) as BaseJobData,
            additionalBroadcasting,
          }) as Promise<BaseJobData>;
        }
      }

      const action = new TestAction();
      const testData = {
        jobId: "test-123",
        importId: "import-456",
      } as BaseJobData;

      const result = await action.execute(
        testData,
        { logger: mockLogger, statusBroadcaster: mockStatusBroadcaster },
        mockContext
      );

      expect(result).toEqual({
        jobId: "test-123",
        importId: "import-456",
        processed: true,
      });
      expect(additionalBroadcasting).toHaveBeenCalledWith(result);
    });

    it("should execute service action without broadcasting when suppressDefaultBroadcast is true", async () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return this.executeServiceAction({
            data,
            deps: { logger: mockLogger },
            context: mockContext,
            serviceCall: async () =>
              ({ ...data, processed: true }) as BaseJobData,
            suppressDefaultBroadcast: true,
          }) as Promise<BaseJobData>;
        }
      }

      const action = new TestAction();
      const testData = {
        jobId: "test-123",
        importId: "import-456",
      } as BaseJobData;

      const result = await action.execute(testData);

      expect(result).toEqual({
        jobId: "test-123",
        importId: "import-456",
        processed: true,
      });
    });

    it("should execute service action without broadcasting when no importId", async () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return this.executeServiceAction({
            data,
            deps: { logger: mockLogger },
            context: mockContext,
            serviceCall: async () =>
              ({ ...data, processed: true }) as BaseJobData,
          }) as Promise<BaseJobData>;
        }
      }

      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData; // No importId

      const result = await action.execute(testData);

      expect(result).toEqual({
        jobId: "test-123",
        processed: true,
      });
    });

    it("should execute service action without broadcasting when no statusBroadcaster", async () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return this.executeServiceAction({
            data,
            deps: {}, // No statusBroadcaster
            context: mockContext,
            serviceCall: async () => ({ ...data, processed: true }),
          }) as Promise<BaseJobData>;
        }
      }

      const action = new TestAction();
      const testData = {
        jobId: "test-123",
        importId: "import-456",
      } as BaseJobData;

      const result = await action.execute(testData);

      expect(result).toEqual({
        jobId: "test-123",
        importId: "import-456",
        processed: true,
      });
    });

    it("should handle service call errors gracefully", async () => {
      class TestAction extends BaseAction {
        name = ActionName.NO_OP;

        async execute(data: BaseJobData): Promise<BaseJobData> {
          return this.executeServiceAction({
            data,
            deps: { logger: mockLogger },
            context: mockContext,
            serviceCall: async () => {
              throw new Error("Service call failed");
            },
          }) as Promise<BaseJobData>;
        }
      }

      const action = new TestAction();
      const testData = {
        jobId: "test-123",
        importId: "import-456",
      } as BaseJobData;

      await expect(action.execute(testData)).rejects.toThrow(
        "Service call failed"
      );
    });
  });
});

describe("NoOpAction", () => {
  beforeEach(() => {
    // No setup needed
  });

  it("should return input data unchanged", async () => {
    const action = new NoOpAction();
    const testData = { jobId: "test-123", someData: "value" } as BaseJobData;

    const result = await action.execute(testData);

    expect(result).toEqual(testData);
  });

  it("should have correct name", () => {
    const action = new NoOpAction();
    expect(action.name).toBe(ActionName.NO_OP);
  });

  it("should work with optional logger dependency", async () => {
    const action = new NoOpAction();
    const testData = { jobId: "test-123" } as BaseJobData;
    const logger = createMockLogger();

    const result = await action.execute(testData, { logger });

    expect(result).toEqual(testData);
  });
});

describe("ValidationAction", () => {
  beforeEach(() => {
    // No setup needed
  });

  it("should pass through data when validation succeeds", async () => {
    const validator = vi.fn().mockReturnValue(null);
    const action = new ValidationAction(validator);
    const testData = { jobId: "test-123" } as BaseJobData;

    const result = await action.execute(testData);

    expect(result).toEqual(testData);
    expect(validator).toHaveBeenCalledWith(testData);
  });

  it("should throw error when validation fails", async () => {
    const validationError = new Error("Invalid data");
    const validator = vi.fn().mockReturnValue(validationError);
    const action = new ValidationAction(validator);
    const testData = { jobId: "test-123" } as BaseJobData;

    await expect(action.execute(testData)).rejects.toThrow("Invalid data");
    expect(validator).toHaveBeenCalledWith(testData);
  });

  it("should have correct name", () => {
    const validator = vi.fn();
    const action = new ValidationAction(validator);
    expect(action.name).toBe(ActionName.VALIDATION);
  });

  it("should not be retryable", () => {
    const validator = vi.fn();
    const action = new ValidationAction(validator);
    expect(action.retryable).toBe(false);
  });
});

describe("LoggingAction", () => {
  let mockContext: ActionContext;
  let mockLogger: { log: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockContext = createMockActionContext();
    mockLogger = createMockLogger();
  });

  it("should log static message and return data unchanged", async () => {
    const action = new LoggingAction("Test message");
    const testData = { jobId: "test-123" } as BaseJobData;

    const result = await action.execute(
      testData,
      { logger: mockLogger },
      mockContext
    );

    expect(result).toEqual(testData);
    expect(mockLogger.log).toHaveBeenCalledWith("[test-job-id] Test message");
  });

  it("should log dynamic message from function", async () => {
    const messageFn = vi.fn().mockReturnValue("Dynamic message");
    const action = new LoggingAction(messageFn);
    const testData = { jobId: "test-123", value: 42 } as BaseJobData;

    const result = await action.execute(
      testData,
      { logger: mockLogger },
      mockContext
    );

    expect(result).toEqual(testData);
    expect(messageFn).toHaveBeenCalledWith(testData, mockContext);
    expect(mockLogger.log).toHaveBeenCalledWith(
      "[test-job-id] Dynamic message"
    );
  });

  it("should use console.log when no logger provided", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const action = new LoggingAction("Test message");
    const testData = { jobId: "test-123" } as BaseJobData;

    const result = await action.execute(testData, {}, mockContext);

    expect(result).toEqual(testData);
    expect(consoleSpy).toHaveBeenCalledWith("[test-job-id] Test message");

    consoleSpy.mockRestore();
  });

  it("should handle logger without log method", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const action = new LoggingAction("Test message");
    const testData = { jobId: "test-123" } as BaseJobData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invalidLogger = { someOtherMethod: vi.fn() } as any;

    const result = await action.execute(
      testData,
      { logger: invalidLogger },
      mockContext
    );

    expect(result).toEqual(testData);
    expect(consoleSpy).toHaveBeenCalledWith("[test-job-id] Test message");

    consoleSpy.mockRestore();
  });

  it("should have correct name", () => {
    const action = new LoggingAction("Test message");
    expect(action.name).toBe(ActionName.LOGGING);
  });

  it("should not be retryable", () => {
    const action = new LoggingAction("Test message");
    expect(action.retryable).toBe(false);
  });
});

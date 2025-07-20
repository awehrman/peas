import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBaseDependenciesFromContainer } from "../../base-worker";
import type { IServiceContainer } from "../../../../services/container";
import type { NoteStatus } from "@peas/database";

describe("createBaseDependenciesFromContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with complete container", () => {
    it("should create base dependencies with all required properties", () => {
      const mockStatusBroadcaster = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      };

      const mockErrorHandler = {
        withErrorHandling: vi.fn(),
      };

      const mockLogger = {
        log: vi.fn(),
      };

      const container: IServiceContainer = {
        statusBroadcaster: mockStatusBroadcaster,
        errorHandler: {
          errorHandler: mockErrorHandler,
        },
        logger: mockLogger,
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      expect(dependencies).toHaveProperty("addStatusEventAndBroadcast");
      expect(dependencies).toHaveProperty("ErrorHandler");
      expect(dependencies).toHaveProperty("logger");
      expect(typeof dependencies.addStatusEventAndBroadcast).toBe("function");
      expect(typeof dependencies.ErrorHandler.withErrorHandling).toBe(
        "function"
      );
      expect(dependencies.logger).toBe(mockLogger);
    });

    it("should call status broadcaster when available", async () => {
      const mockAddStatusEvent = vi.fn().mockResolvedValue(undefined);
      const container: IServiceContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: mockAddStatusEvent,
        },
        errorHandler: {
          errorHandler: {
            withErrorHandling: vi.fn(),
          },
        },
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "processing" as NoteStatus,
        message: "Test message",
        context: "test-context",
        currentCount: 1,
        totalCount: 10,
        indentLevel: 0,
      };

      await dependencies.addStatusEventAndBroadcast(event);

      expect(mockAddStatusEvent).toHaveBeenCalledWith(event);
    });
  });

  describe("with missing status broadcaster", () => {
    it("should return resolved promise when status broadcaster not available", async () => {
      const container: IServiceContainer = {
        statusBroadcaster: undefined,
        errorHandler: {
          errorHandler: {
            withErrorHandling: vi.fn(),
          },
        },
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "processing" as NoteStatus,
        message: "Test message",
      };

      const result = await dependencies.addStatusEventAndBroadcast(event);
      expect(result).toBeUndefined();
    });
  });

  describe("with missing error handler", () => {
    it("should provide default error handler when container error handler not available", () => {
      const container: IServiceContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
        errorHandler: undefined,
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      expect(dependencies.ErrorHandler).toEqual({
        withErrorHandling: expect.any(Function),
      });
    });

    it("should provide default error handler when container error handler is null", () => {
      const container: IServiceContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
        errorHandler: {
          errorHandler: null,
        },
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      expect(dependencies.ErrorHandler).toEqual({
        withErrorHandling: expect.any(Function),
      });
    });

    it("should provide default error handler when container error handler is undefined", () => {
      const container: IServiceContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
        errorHandler: {
          errorHandler: undefined,
        },
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      expect(dependencies.ErrorHandler).toEqual({
        withErrorHandling: expect.any(Function),
      });
    });
  });

  describe("default error handler functionality", () => {
    it("should execute operation without error handling when using default handler", async () => {
      const container: IServiceContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
        errorHandler: undefined,
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      const testOperation = vi.fn().mockResolvedValue("test result");
      const result =
        await dependencies.ErrorHandler.withErrorHandling(testOperation);

      expect(result).toBe("test result");
      expect(testOperation).toHaveBeenCalledOnce();
    });

    it("should propagate errors when using default handler", async () => {
      const container: IServiceContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
        errorHandler: undefined,
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      const testOperation = vi.fn().mockRejectedValue(new Error("Test error"));

      await expect(
        dependencies.ErrorHandler.withErrorHandling(testOperation)
      ).rejects.toThrow("Test error");
    });
  });

  describe("event parameter handling", () => {
    it("should handle events with all optional properties", async () => {
      const mockAddStatusEvent = vi.fn().mockResolvedValue(undefined);
      const container: IServiceContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: mockAddStatusEvent,
        },
        errorHandler: {
          errorHandler: {
            withErrorHandling: vi.fn(),
          },
        },
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "completed" as NoteStatus,
        message: "Test message",
        context: "test-context",
        currentCount: 5,
        totalCount: 10,
        indentLevel: 2,
      };

      await dependencies.addStatusEventAndBroadcast(event);

      expect(mockAddStatusEvent).toHaveBeenCalledWith(event);
    });

    it("should handle events with minimal required properties", async () => {
      const mockAddStatusEvent = vi.fn().mockResolvedValue(undefined);
      const container: IServiceContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: mockAddStatusEvent,
        },
        errorHandler: {
          errorHandler: {
            withErrorHandling: vi.fn(),
          },
        },
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = createBaseDependenciesFromContainer(container);

      const event = {
        importId: "test-import",
        status: "processing" as NoteStatus,
      };

      await dependencies.addStatusEventAndBroadcast(event);

      expect(mockAddStatusEvent).toHaveBeenCalledWith(event);
    });
  });
});

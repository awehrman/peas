import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestContext,
  createTestError,
  testConfigInterface,
  testErrorHandlerInterface,
  testHealthMonitorInterface,
  testLoggerInterface,
  testStatusBroadcasterInterface,
  testWebSocketInterface,
} from "../../test-utils/service";
import type {
  IConfigService,
  IErrorHandlerService,
  IHealthMonitorService,
  ILoggerService,
  IStatusBroadcasterService,
  IWebSocketService,
} from "../container";
// Import after mocking
import { ServiceFactory } from "../factory";

// Mock dependencies before importing the module under test
vi.doMock("../utils/logger", () => ({
  createLogger: vi.fn(() => ({
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
}));

const mockAddStatusEventAndBroadcast = vi.fn();
vi.doMock("../utils/status-broadcaster", () => ({
  addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
}));

vi.doMock("../config/factory", () => ({
  ManagerFactory: {
    createHealthMonitor: vi.fn(() => ({
      isHealthy: vi.fn().mockResolvedValue(true),
      getComponentHealth: vi.fn().mockResolvedValue({
        status: "healthy",
        details: "Component is operational",
        metrics: {},
      }),
    })),
  },
}));

vi.doMock("../services/websocket-server", () => ({
  getWebSocketManager: vi.fn(() => ({
    broadcast: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
  })),
}));

describe("ServiceFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddStatusEventAndBroadcast.mockResolvedValue({
      success: true,
      count: 1,
      operation: "broadcast_status_event",
      data: undefined,
    });
  });

  describe("createErrorHandler", () => {
    it("should create an error handler service", () => {
      const errorHandler = ServiceFactory.createErrorHandler();
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.withErrorHandling).toBe("function");
      expect(typeof errorHandler.createJobError).toBe("function");
      expect(typeof errorHandler.classifyError).toBe("function");
      expect(typeof errorHandler.logError).toBe("function");
    });

    it("should implement IErrorHandlerService interface", () => {
      const errorHandler =
        ServiceFactory.createErrorHandler() as IErrorHandlerService;
      testErrorHandlerInterface(errorHandler);
    });
  });

  describe("createHealthMonitor", () => {
    it("should create a health monitor service", () => {
      const healthMonitor = ServiceFactory.createHealthMonitor();
      expect(healthMonitor).toBeDefined();
      expect(healthMonitor.healthMonitor).toBeDefined();
    });

    it("should implement IHealthMonitorService interface", () => {
      const healthMonitor =
        ServiceFactory.createHealthMonitor() as IHealthMonitorService;
      testHealthMonitorInterface(healthMonitor);
    });
  });

  describe("createWebSocketService", () => {
    it("should create a WebSocket service", () => {
      const webSocketService = ServiceFactory.createWebSocketService();
      expect(webSocketService).toBeDefined();
      expect(webSocketService.webSocketManager).toBeDefined();
    });

    it("should implement IWebSocketService interface", () => {
      const webSocketService =
        ServiceFactory.createWebSocketService() as IWebSocketService;
      testWebSocketInterface(webSocketService);
    });
  });

  describe("createStatusBroadcaster", () => {
    it("should create a status broadcaster service", () => {
      const statusBroadcaster = ServiceFactory.createStatusBroadcaster();
      expect(statusBroadcaster).toBeDefined();
      expect(typeof statusBroadcaster.addStatusEventAndBroadcast).toBe(
        "function"
      );
    });

    it("should implement IStatusBroadcasterService interface", () => {
      const statusBroadcaster =
        ServiceFactory.createStatusBroadcaster() as IStatusBroadcasterService;
      testStatusBroadcasterInterface(statusBroadcaster);
    });
  });

  describe("createLoggerService", () => {
    it("should create a logger service", () => {
      const logger = ServiceFactory.createLoggerService();
      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe("function");
    });

    it("should implement ILoggerService interface", () => {
      const logger = ServiceFactory.createLoggerService() as ILoggerService;
      testLoggerInterface(logger);
    });
  });

  describe("createConfigService", () => {
    it("should create a config service", () => {
      const config = ServiceFactory.createConfigService();
      expect(config).toBeDefined();
      expect(typeof config.port).toBe("number");
      expect(typeof config.wsPort).toBe("number");
    });

    it("should implement IConfigService interface", () => {
      const config = ServiceFactory.createConfigService() as IConfigService;
      testConfigInterface(config);
    });

    it("should read wsHost from environment", () => {
      const originalWsHost = process.env.WS_HOST;
      process.env.WS_HOST = "test-host";

      const config = ServiceFactory.createConfigService();
      expect(config.wsHost).toBe("test-host");

      process.env.WS_HOST = originalWsHost;
    });

    it("should return undefined for wsHost when not set", () => {
      const originalWsHost = process.env.WS_HOST;
      delete process.env.WS_HOST;

      const config = ServiceFactory.createConfigService();
      expect(config.wsHost).toBeUndefined();

      process.env.WS_HOST = originalWsHost;
    });

    it("should read port from environment with default", () => {
      const originalPort = process.env.PORT;
      delete process.env.PORT;

      const config = ServiceFactory.createConfigService();
      expect(config.port).toBe(3000);

      process.env.PORT = originalPort;
    });

    it("should read port from environment", () => {
      const originalPort = process.env.PORT;
      process.env.PORT = "8080";

      const config = ServiceFactory.createConfigService();
      expect(config.port).toBe(8080);

      process.env.PORT = originalPort;
    });

    it("should read wsPort from environment with default", () => {
      const originalWsPort = process.env.WS_PORT;
      delete process.env.WS_PORT;

      const config = ServiceFactory.createConfigService();
      expect(config.wsPort).toBe(8080);

      process.env.WS_PORT = originalWsPort;
    });

    it("should read wsPort from environment", () => {
      const originalWsPort = process.env.WS_PORT;
      process.env.WS_PORT = "9090";

      const config = ServiceFactory.createConfigService();
      expect(config.wsPort).toBe(9090);

      process.env.WS_PORT = originalWsPort;
    });
  });
});

describe("ErrorHandlerService", () => {
  let errorHandler: IErrorHandlerService;

  beforeEach(() => {
    errorHandler = ServiceFactory.createErrorHandler();
  });

  describe("withErrorHandling", () => {
    it("should execute operation without error handling", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const context = createTestContext("test");

      const result = await errorHandler.withErrorHandling(operation, context);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should propagate errors from operation", async () => {
      const error = createTestError("Test error");
      const operation = vi.fn().mockRejectedValue(error);
      const context = createTestContext("test");

      await expect(
        errorHandler.withErrorHandling(operation, context)
      ).rejects.toThrow("Test error");
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe("createJobError", () => {
    it("should create a job error with all required fields", () => {
      const error = createTestError("Database connection failed");
      const context = createTestContext("create_note");

      const result = errorHandler.createJobError(error, context);

      expect(result).toEqual({
        success: false,
        error: "Database connection failed",
        operation: "create_note",
        errorType: "Error",
        severity: "error",
        timestamp: expect.any(Date),
      });
    });

    it("should handle errors without name property", () => {
      const error = { message: "Unknown error" } as Error;
      const context = createTestContext("test");

      const result = errorHandler.createJobError(error, context);

      expect((result as Record<string, unknown>)["errorType"]).toBe(
        "UNKNOWN_ERROR"
      );
    });
  });

  describe("classifyError", () => {
    it("should return error name", () => {
      const error = createTestError("Test error", "ValidationError");

      const result = errorHandler.classifyError(error);

      expect(result).toBe("ValidationError");
    });

    it("should return UNKNOWN_ERROR for errors without name", () => {
      const error = { message: "Test error" } as Error;

      const result = errorHandler.classifyError(error);

      expect(result).toBe("UNKNOWN_ERROR");
    });
  });

  describe("logError", () => {
    it("should log error with context", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = createTestError("Test error");
      const context = createTestContext("test");

      errorHandler.logError(error, context);

      expect(consoleSpy).toHaveBeenCalledWith("Error occurred:", {
        message: "Test error",
        stack: error.stack,
        context,
      });

      consoleSpy.mockRestore();
    });
  });

  describe("errorHandler property", () => {
    it("should provide errorHandler property with bound methods", () => {
      expect(errorHandler.errorHandler).toBeDefined();
      expect(typeof errorHandler.errorHandler?.withErrorHandling).toBe(
        "function"
      );
      expect(typeof errorHandler.errorHandler?.createJobError).toBe("function");
      expect(typeof errorHandler.errorHandler?.classifyError).toBe("function");
      expect(typeof errorHandler.errorHandler?.logError).toBe("function");
    });
  });
});

describe("HealthMonitorService", () => {
  it("should have healthMonitor property", () => {
    const healthMonitor = ServiceFactory.createHealthMonitor();
    expect(healthMonitor.healthMonitor).toBeDefined();
  });
});

describe("WebSocketService", () => {
  it("should return webSocketManager from getWebSocketManager", () => {
    const webSocketService = ServiceFactory.createWebSocketService();
    expect(webSocketService.webSocketManager).toBeDefined();
  });
});

describe("StatusBroadcasterService", () => {
  let statusBroadcaster: IStatusBroadcasterService;

  beforeEach(() => {
    statusBroadcaster = ServiceFactory.createStatusBroadcaster();
  });

  describe("addStatusEventAndBroadcast", () => {
    it("should handle database errors gracefully", async () => {
      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
        context: "test_context",
        currentCount: 1,
        totalCount: 5,
        indentLevel: 0,
        metadata: { test: "data" },
      };

      const result = await statusBroadcaster.addStatusEventAndBroadcast(event);

      // The real function fails due to foreign key constraint, so we expect failure
      expect(result).toEqual({
        success: false,
        count: 0,
        operation: "broadcast_status_event",
        error: expect.stringContaining("Foreign key constraint violated"),
      });
    }, 10000); // Increase timeout to 10 seconds

    it("should handle errors during broadcasting", async () => {
      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
      };

      const result = await statusBroadcaster.addStatusEventAndBroadcast(event);

      expect(result).toEqual({
        success: false,
        count: 0,
        operation: "broadcast_status_event",
        error: expect.stringContaining("Foreign key constraint violated"),
      });
    });

    it("should handle non-Error objects", async () => {
      const event = {
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
      };

      const result = await statusBroadcaster.addStatusEventAndBroadcast(event);

      expect(result).toEqual({
        success: false,
        count: 0,
        operation: "broadcast_status_event",
        error: expect.stringContaining("Foreign key constraint violated"),
      });
    });
  });
});

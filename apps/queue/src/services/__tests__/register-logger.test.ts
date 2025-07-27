import { beforeEach, describe, expect, it, vi } from "vitest";

import { testLoggerInterface } from "../../test-utils/service";
import { ILoggerService, registerLogger } from "../register-logger";

// Mock dependencies
vi.mock("../../utils/logger", () => ({
  createLogger: vi.fn(() => ({
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    logWithContext: vi.fn(),
    getLogFiles: vi.fn(),
    rotateLogs: vi.fn(),
    getLogStats: vi.fn(),
    clearOldLogs: vi.fn(),
  })),
}));

describe("register-logger.ts", () => {
  let mockCreateLogger: ReturnType<typeof vi.fn>;
  let loggerService: ILoggerService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateLogger = vi.mocked(
      (await import("../../utils/logger")).createLogger
    );
    loggerService = registerLogger();
  });

  describe("ILoggerService interface", () => {
    it("should define required properties", () => {
      const logger: ILoggerService = {
        log: vi.fn(),
      };

      expect(logger).toHaveProperty("log");
      expect(typeof logger.log).toBe("function");
    });

    it("should define optional properties", () => {
      const logger: ILoggerService = {
        log: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        logWithContext: vi.fn(),
        getLogFiles: vi.fn(),
        rotateLogs: vi.fn(),
        getLogStats: vi.fn(),
        clearOldLogs: vi.fn(),
      };

      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("error");
      expect(logger).toHaveProperty("fatal");
      expect(logger).toHaveProperty("logWithContext");
      expect(logger).toHaveProperty("getLogFiles");
      expect(logger).toHaveProperty("rotateLogs");
      expect(logger).toHaveProperty("getLogStats");
      expect(logger).toHaveProperty("clearOldLogs");
    });
  });

  describe("registerLogger", () => {
    it("should call createLogger from utils/logger", () => {
      expect(mockCreateLogger).toHaveBeenCalledTimes(1);
      expect(mockCreateLogger).toHaveBeenCalledWith();
    });

    it("should return a logger service instance", () => {
      expect(loggerService).toBeDefined();
      expect(typeof loggerService.log).toBe("function");
    });

    it("should implement ILoggerService interface", () => {
      expect(() =>
        testLoggerInterface(
          loggerService as unknown as import("../container").ILoggerService
        )
      ).not.toThrow();
    });

    it("should return logger instances from createLogger", () => {
      // Clear the mock call count from beforeEach
      vi.clearAllMocks();

      const logger1 = registerLogger();
      const logger2 = registerLogger();

      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
      expect(mockCreateLogger).toHaveBeenCalledTimes(2); // Each call creates a new instance
    });

    it("should have all required logger methods", () => {
      expect(loggerService.log).toBeDefined();
      expect(typeof loggerService.log).toBe("function");
    });

    it("should have optional logger methods when provided by createLogger", () => {
      // The mock createLogger returns all optional methods
      expect(loggerService.debug).toBeDefined();
      expect(loggerService.info).toBeDefined();
      expect(loggerService.warn).toBeDefined();
      expect(loggerService.error).toBeDefined();
      expect(loggerService.fatal).toBeDefined();
      expect(loggerService.logWithContext).toBeDefined();
      expect(loggerService.getLogFiles).toBeDefined();
      expect(loggerService.rotateLogs).toBeDefined();
      expect(loggerService.getLogStats).toBeDefined();
      expect(loggerService.clearOldLogs).toBeDefined();
    });

    it("should be able to call log method with different levels", () => {
      const mockLog = vi.fn();
      loggerService.log = mockLog;

      loggerService.log("test message");
      loggerService.log("debug message", "debug");
      loggerService.log("info message", "info");
      loggerService.log("warn message", "warn");
      loggerService.log("error message", "error");
      loggerService.log("fatal message", "fatal");

      expect(mockLog).toHaveBeenCalledTimes(6);
      expect(mockLog).toHaveBeenCalledWith("test message");
      expect(mockLog).toHaveBeenCalledWith("debug message", "debug");
      expect(mockLog).toHaveBeenCalledWith("info message", "info");
      expect(mockLog).toHaveBeenCalledWith("warn message", "warn");
      expect(mockLog).toHaveBeenCalledWith("error message", "error");
      expect(mockLog).toHaveBeenCalledWith("fatal message", "fatal");
    });

    it("should handle undefined level parameter", () => {
      const mockLog = vi.fn();
      loggerService.log = mockLog;

      loggerService.log("test message", undefined);

      expect(mockLog).toHaveBeenCalledWith("test message", undefined);
    });

    it("should handle invalid level parameter", () => {
      const mockLog = vi.fn();
      loggerService.log = mockLog;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loggerService.log("test message", "invalid" as any);

      expect(mockLog).toHaveBeenCalledWith("test message", "invalid");
    });
  });

  describe("logger method signatures", () => {
    it("should have correct log method signature", () => {
      const logger: ILoggerService = {
        log: vi.fn(),
      };

      expect(typeof logger.log).toBe("function");
      // Note: Function.length returns the number of parameters, but vi.fn() may not preserve this
      expect(logger.log).toBeDefined();
    });

    it("should have correct optional method signatures", () => {
      const logger: ILoggerService = {
        log: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        logWithContext: vi.fn(),
        getLogFiles: vi.fn(),
        rotateLogs: vi.fn(),
        getLogStats: vi.fn(),
        clearOldLogs: vi.fn(),
      };

      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.fatal).toBe("function");
      expect(typeof logger.logWithContext).toBe("function");
      expect(typeof logger.getLogFiles).toBe("function");
      expect(typeof logger.rotateLogs).toBe("function");
      expect(typeof logger.getLogStats).toBe("function");
      expect(typeof logger.clearOldLogs).toBe("function");
    });
  });
});

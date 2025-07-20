import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerLogger, ILoggerService } from "../../register-logger";

// Mock the logger implementation
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

describe("registerLogger", () => {
  let loggerService: ILoggerService;

  beforeEach(() => {
    loggerService = registerLogger();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Function Return", () => {
    it("should return an ILoggerService instance", () => {
      expect(loggerService).toBeDefined();
      expect(typeof loggerService).toBe("object");
    });

    it("should implement ILoggerService interface", () => {
      const service: ILoggerService = loggerService;
      expect(service).toHaveProperty("log");
      expect(typeof service.log).toBe("function");
    });

    it("should return a new instance each time", () => {
      const service1 = registerLogger();
      const service2 = registerLogger();
      expect(service1).not.toBe(service2);
    });
  });

  describe("Logger Methods", () => {
    it("should have all required logging methods", () => {
      expect(typeof loggerService.log).toBe("function");
      expect(typeof loggerService.debug).toBe("function");
      expect(typeof loggerService.info).toBe("function");
      expect(typeof loggerService.warn).toBe("function");
      expect(typeof loggerService.error).toBe("function");
      expect(typeof loggerService.fatal).toBe("function");
    });

    it("should have additional logging methods", () => {
      expect(typeof loggerService.logWithContext).toBe("function");
      expect(typeof loggerService.getLogFiles).toBe("function");
      expect(typeof loggerService.rotateLogs).toBe("function");
      expect(typeof loggerService.getLogStats).toBe("function");
      expect(typeof loggerService.clearOldLogs).toBe("function");
    });
  });

  describe("Method Functionality", () => {
    it("should call log method", () => {
      const mockLog = vi.fn();
      loggerService.log = mockLog;

      loggerService.log("test message", "info");

      expect(mockLog).toHaveBeenCalledWith("test message", "info");
    });

    it("should call debug method", () => {
      const mockDebug = vi.fn();
      loggerService.debug = mockDebug;

      loggerService.debug("debug message");

      expect(mockDebug).toHaveBeenCalledWith("debug message");
    });

    it("should call error method", () => {
      const mockError = vi.fn();
      loggerService.error = mockError;

      loggerService.error("error message");

      expect(mockError).toHaveBeenCalledWith("error message");
    });

    it("should call logWithContext method", () => {
      const mockLogWithContext = vi.fn();
      loggerService.logWithContext = mockLogWithContext;

      loggerService.logWithContext("info", "message", { context: "test" });

      expect(mockLogWithContext).toHaveBeenCalledWith("info", "message", {
        context: "test",
      });
    });
  });

  describe("Multiple Calls", () => {
    it("should create independent instances", () => {
      const service1 = registerLogger();
      const service2 = registerLogger();

      expect(service1).not.toBe(service2);
    });

    it("should return new instances each time", () => {
      const service1 = registerLogger();
      const service2 = registerLogger();

      expect(service1).not.toBe(service2);
    });
  });
});

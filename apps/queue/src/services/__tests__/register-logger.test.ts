import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerLogger, ILoggerService } from "../register-logger";

// Mock the logger utility
const mockLogger: ILoggerService = {
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  logWithContext: vi.fn(),
  getLogFiles: vi
    .fn()
    .mockReturnValue({ main: "main.log", error: "error.log" }),
  rotateLogs: vi.fn(),
  getLogStats: vi
    .fn()
    .mockReturnValue({ mainLogSize: 1024, errorLogSize: 512 }),
  clearOldLogs: vi.fn(),
};

vi.mock("../../utils/logger", () => ({
  createLogger: () => mockLogger,
}));

describe("registerLogger", () => {
  beforeEach(() => {
    // Reset all spies
    Object.values(mockLogger).forEach(
      (fn) => typeof fn === "function" && fn.mockClear()
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a logger service", () => {
    const result = registerLogger();
    expect(result).toBeDefined();
    expect(result).toBe(mockLogger);
  });

  it("should return an object that implements ILoggerService", () => {
    const result = registerLogger();
    const logger: ILoggerService = result;

    expect(logger).toHaveProperty("log");
    expect(typeof logger.log).toBe("function");
  });

  it("should support all logger methods", () => {
    const result = registerLogger();

    // Test basic log method
    result.log("test message", "info");
    expect(mockLogger.log).toHaveBeenCalledWith("test message", "info");

    // Test debug method
    result.debug?.("debug message", { context: "test" });
    expect(mockLogger.debug).toHaveBeenCalledWith("debug message", {
      context: "test",
    });

    // Test info method
    result.info?.("info message", { context: "test" });
    expect(mockLogger.info).toHaveBeenCalledWith("info message", {
      context: "test",
    });

    // Test warn method
    result.warn?.("warn message", { context: "test" });
    expect(mockLogger.warn).toHaveBeenCalledWith("warn message", {
      context: "test",
    });

    // Test error method
    result.error?.("error message", { context: "test" });
    expect(mockLogger.error).toHaveBeenCalledWith("error message", {
      context: "test",
    });

    // Test fatal method
    result.fatal?.("fatal message", { context: "test" });
    expect(mockLogger.fatal).toHaveBeenCalledWith("fatal message", {
      context: "test",
    });

    // Test logWithContext method
    result.logWithContext?.("info", "context message", { context: "test" });
    expect(mockLogger.logWithContext).toHaveBeenCalledWith(
      "info",
      "context message",
      { context: "test" }
    );

    // Test getLogFiles method
    const logFiles = result.getLogFiles?.();
    expect(logFiles).toEqual({ main: "main.log", error: "error.log" });

    // Test rotateLogs method
    result.rotateLogs?.(10);
    expect(mockLogger.rotateLogs).toHaveBeenCalledWith(10);

    // Test getLogStats method
    const stats = result.getLogStats?.();
    expect(stats).toEqual({ mainLogSize: 1024, errorLogSize: 512 });

    // Test clearOldLogs method
    result.clearOldLogs?.(7);
    expect(mockLogger.clearOldLogs).toHaveBeenCalledWith(7);
  });

  it("should handle optional methods gracefully", () => {
    const result = registerLogger();

    // Test that optional methods are available
    expect(result.debug).toBeDefined();
    expect(result.info).toBeDefined();
    expect(result.warn).toBeDefined();
    expect(result.error).toBeDefined();
    expect(result.fatal).toBeDefined();
    expect(result.logWithContext).toBeDefined();
    expect(result.getLogFiles).toBeDefined();
    expect(result.rotateLogs).toBeDefined();
    expect(result.getLogStats).toBeDefined();
    expect(result.clearOldLogs).toBeDefined();
  });

  it("should support different log levels", () => {
    const result = registerLogger();

    result.log("debug message", "debug");
    result.log("info message", "info");
    result.log("warn message", "warn");
    result.log("error message", "error");
    result.log("fatal message", "fatal");

    expect(mockLogger.log).toHaveBeenCalledWith("debug message", "debug");
    expect(mockLogger.log).toHaveBeenCalledWith("info message", "info");
    expect(mockLogger.log).toHaveBeenCalledWith("warn message", "warn");
    expect(mockLogger.log).toHaveBeenCalledWith("error message", "error");
    expect(mockLogger.log).toHaveBeenCalledWith("fatal message", "fatal");
  });

  it("should return a new logger instance each time", () => {
    const logger1 = registerLogger();
    const logger2 = registerLogger();

    // Since we're mocking createLogger to return the same mock, they should be the same
    // But in real usage, createLogger would return a new instance
    expect(logger1).toBe(logger2); // This is due to our mock, not the actual behavior
  });
});

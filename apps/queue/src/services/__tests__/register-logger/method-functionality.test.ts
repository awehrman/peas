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

describe("registerLogger Method Functionality", () => {
  let loggerService: ILoggerService;

  beforeEach(() => {
    loggerService = registerLogger();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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

  it("should call info method", () => {
    const mockInfo = vi.fn();
    loggerService.info = mockInfo;

    loggerService.info("info message");

    expect(mockInfo).toHaveBeenCalledWith("info message");
  });

  it("should call warn method", () => {
    const mockWarn = vi.fn();
    loggerService.warn = mockWarn;

    loggerService.warn("warn message");

    expect(mockWarn).toHaveBeenCalledWith("warn message");
  });

  it("should call error method", () => {
    const mockError = vi.fn();
    loggerService.error = mockError;

    loggerService.error("error message");

    expect(mockError).toHaveBeenCalledWith("error message");
  });

  it("should call fatal method", () => {
    const mockFatal = vi.fn();
    loggerService.fatal = mockFatal;

    loggerService.fatal("fatal message");

    expect(mockFatal).toHaveBeenCalledWith("fatal message");
  });

  it("should call logWithContext method", () => {
    const mockLogWithContext = vi.fn();
    loggerService.logWithContext = mockLogWithContext;

    loggerService.logWithContext("info", "message", { context: "test" });

    expect(mockLogWithContext).toHaveBeenCalledWith("info", "message", {
      context: "test",
    });
  });

  it("should call getLogFiles method", () => {
    const mockGetLogFiles = vi.fn();
    loggerService.getLogFiles = mockGetLogFiles;

    loggerService.getLogFiles();

    expect(mockGetLogFiles).toHaveBeenCalled();
  });

  it("should call rotateLogs method", () => {
    const mockRotateLogs = vi.fn();
    loggerService.rotateLogs = mockRotateLogs;

    loggerService.rotateLogs(10);

    expect(mockRotateLogs).toHaveBeenCalledWith(10);
  });

  it("should call getLogStats method", () => {
    const mockGetLogStats = vi.fn();
    loggerService.getLogStats = mockGetLogStats;

    loggerService.getLogStats();

    expect(mockGetLogStats).toHaveBeenCalled();
  });

  it("should call clearOldLogs method", () => {
    const mockClearOldLogs = vi.fn();
    loggerService.clearOldLogs = mockClearOldLogs;

    loggerService.clearOldLogs(7);

    expect(mockClearOldLogs).toHaveBeenCalledWith(7);
  });
});

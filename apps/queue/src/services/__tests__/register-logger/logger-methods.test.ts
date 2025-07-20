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

describe("registerLogger Logger Methods", () => {
  let loggerService: ILoggerService;

  beforeEach(() => {
    loggerService = registerLogger();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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

  it("should have log method with correct signature", () => {
    expect(typeof loggerService.log).toBe("function");
    expect(loggerService.log.length).toBeGreaterThanOrEqual(1); // At least one parameter
  });

  it("should have debug method with correct signature", () => {
    expect(typeof loggerService.debug).toBe("function");
    expect(loggerService.debug?.length).toBeGreaterThanOrEqual(1); // At least one parameter
  });

  it("should have info method with correct signature", () => {
    expect(typeof loggerService.info).toBe("function");
    expect(loggerService.info?.length).toBeGreaterThanOrEqual(1); // At least one parameter
  });

  it("should have warn method with correct signature", () => {
    expect(typeof loggerService.warn).toBe("function");
    expect(loggerService.warn?.length).toBeGreaterThanOrEqual(1); // At least one parameter
  });

  it("should have error method with correct signature", () => {
    expect(typeof loggerService.error).toBe("function");
    expect(loggerService.error?.length).toBeGreaterThanOrEqual(1); // At least one parameter
  });

  it("should have fatal method with correct signature", () => {
    expect(typeof loggerService.fatal).toBe("function");
    expect(loggerService.fatal?.length).toBeGreaterThanOrEqual(1); // At least one parameter
  });
});

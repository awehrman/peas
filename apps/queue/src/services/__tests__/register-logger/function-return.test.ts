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

describe("registerLogger Function Return", () => {
  let loggerService: ILoggerService;

  beforeEach(() => {
    loggerService = registerLogger();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerLogger } from "../../register-logger";

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

describe("registerLogger Multiple Calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

  it("should create unique instances for each call", () => {
    const instances = [];
    for (let i = 0; i < 5; i++) {
      instances.push(registerLogger());
    }

    // All instances should be different
    for (let i = 0; i < instances.length; i++) {
      for (let j = i + 1; j < instances.length; j++) {
        expect(instances[i]).not.toBe(instances[j]);
      }
    }
  });

  it("should maintain separate method references for each instance", () => {
    const service1 = registerLogger();
    const service2 = registerLogger();

    // Mock different behaviors for each instance
    const mockLog1 = vi.fn();
    const mockLog2 = vi.fn();

    service1.log = mockLog1;
    service2.log = mockLog2;

    service1.log("message1");
    service2.log("message2");

    expect(mockLog1).toHaveBeenCalledWith("message1");
    expect(mockLog2).toHaveBeenCalledWith("message2");
    expect(mockLog1).not.toHaveBeenCalledWith("message2");
    expect(mockLog2).not.toHaveBeenCalledWith("message1");
  });
});

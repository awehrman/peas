import { describe, it, expect } from "vitest";

// Import all exports from the barrel file to ensure coverage
import * as Utils from "../index";

describe("utils/index", () => {
  it("should export all expected modules", () => {
    // Test that all expected exports are available
    expect(Utils).toHaveProperty("ErrorHandler");
    expect(Utils).toHaveProperty("QueueError");
    expect(Utils).toHaveProperty("HealthMonitor");
    expect(Utils).toHaveProperty("validateJobData");
  });

  it("should export ErrorHandler with all expected methods", () => {
    expect(typeof Utils.ErrorHandler.createJobError).toBe("function");
    expect(typeof Utils.ErrorHandler.createValidationError).toBe("function");
    expect(typeof Utils.ErrorHandler.createDatabaseError).toBe("function");
    expect(typeof Utils.ErrorHandler.shouldRetry).toBe("function");
    expect(typeof Utils.ErrorHandler.calculateBackoff).toBe("function");
    expect(typeof Utils.ErrorHandler.logError).toBe("function");
    expect(typeof Utils.ErrorHandler.classifyError).toBe("function");
    expect(typeof Utils.ErrorHandler.withErrorHandling).toBe("function");
    expect(typeof Utils.ErrorHandler.validateJobData).toBe("function");
  });

  it("should export QueueError class", () => {
    expect(Utils.QueueError).toBeDefined();
    expect(typeof Utils.QueueError).toBe("function");
  });

  it("should export HealthMonitor class", () => {
    expect(Utils.HealthMonitor).toBeDefined();
    expect(typeof Utils.HealthMonitor).toBe("function");
    expect(typeof Utils.HealthMonitor.getInstance).toBe("function");
  });

  it("should export validateJobData function", () => {
    expect(typeof Utils.validateJobData).toBe("function");
  });
});

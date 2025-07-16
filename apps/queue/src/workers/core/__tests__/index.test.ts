import { describe, it, expect } from "vitest";

// Import all exports from the barrel file to ensure coverage
import * as Core from "../index";

describe("workers/core/index", () => {
  it("should export all expected modules", () => {
    // Test that all expected exports are available
    expect(Core).toHaveProperty("BaseWorker");
    expect(Core).toHaveProperty("BaseAction");
    expect(Core).toHaveProperty("ActionFactory");
    expect(Core).toHaveProperty("ActionResultCache");
    expect(Core).toHaveProperty("globalActionCache");
    expect(Core).toHaveProperty("createCacheKey");
    expect(Core).toHaveProperty("MetricsCollector");
    expect(Core).toHaveProperty("globalMetrics");
    expect(Core).toHaveProperty("WorkerMetrics");
    expect(Core).toHaveProperty("WorkerError");
    expect(Core).toHaveProperty("NoteProcessingError");
    expect(Core).toHaveProperty("ActionValidationError");
    expect(Core).toHaveProperty("ActionExecutionError");
    expect(Core).toHaveProperty("MissingDependencyError");
    expect(Core).toHaveProperty("ServiceUnhealthyError");
  });

  it("should export core worker infrastructure", () => {
    expect(typeof Core.BaseWorker).toBe("function");
    expect(typeof Core.BaseAction).toBe("function");
    expect(typeof Core.ActionFactory).toBe("function");
  });

  it("should export cache utilities", () => {
    expect(typeof Core.ActionResultCache).toBe("function");
    expect(typeof Core.globalActionCache).toBe("object");
    expect(typeof Core.createCacheKey).toBe("function");
  });

  it("should export metrics", () => {
    expect(typeof Core.MetricsCollector).toBe("function");
    expect(typeof Core.globalMetrics).toBe("object");
    expect(typeof Core.WorkerMetrics).toBe("function");
  });

  it("should export error classes", () => {
    expect(typeof Core.WorkerError).toBe("function");
    expect(typeof Core.NoteProcessingError).toBe("function");
    expect(typeof Core.ActionValidationError).toBe("function");
    expect(typeof Core.ActionExecutionError).toBe("function");
    expect(typeof Core.MissingDependencyError).toBe("function");
    expect(typeof Core.ServiceUnhealthyError).toBe("function");
  });
});

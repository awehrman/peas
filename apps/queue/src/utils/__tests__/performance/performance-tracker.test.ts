import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { performanceTracker } from "../../performance";

// Helper to silence console.log during tests
let consoleSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  consoleSpy.mockRestore();
});

describe("PerformanceTracker", () => {
  beforeEach(() => {
    // Clear private metrics for test isolation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Access private property for test
    (performanceTracker as any).metrics.clear();
  });

  it("start() should return a unique id and store metrics", () => {
    const id = performanceTracker.start("testOp", "note1", "ctx");
    expect(typeof id).toBe("string");
    // @ts-expect-error: access private for test
    const metric = performanceTracker.metrics.get(id);
    expect(metric).toBeDefined();
    if (!metric) throw new Error("Metric not found");
    expect(metric.operation).toBe("testOp");
    expect(metric.noteId).toBe("note1");
    expect(metric.context).toBe("ctx");
    expect(typeof metric.startTime).toBe("number");
  });

  it("end() should return metrics, log, and delete entry", () => {
    const id = performanceTracker.start("endOp", "note2");
    // Simulate some time passing
    // @ts-expect-error: access private for test
    const metric = performanceTracker.metrics.get(id);
    expect(metric).toBeDefined();
    if (!metric) throw new Error("Metric not found");
    metric.startTime -= 50;
    const result = performanceTracker.end(id);
    expect(result).toBeDefined();
    expect(result?.operation).toBe("endOp");
    expect(result?.noteId).toBe("note2");
    expect(typeof result?.endTime).toBe("number");
    expect(typeof result?.duration).toBe("number");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("endOp took ")
    );
    // Entry should be deleted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Access private property for test
    expect((performanceTracker as any).metrics.has(id)).toBe(false);
  });

  it("end() should return null if id not found", () => {
    expect(performanceTracker.end("fake-id")).toBeNull();
  });

  it("getAverageDuration() should return 0 if no durations", () => {
    expect(performanceTracker.getAverageDuration("none")).toBe(0);
  });
});

describe("performanceTracker singleton", () => {
  it("should be an instance of PerformanceTracker", () => {
    expect(performanceTracker.constructor.name).toBe("PerformanceTracker");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { performanceTracker, trackPerformance } from "../performance";

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
    performanceTracker.metrics.clear();
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
    expect(performanceTracker.metrics.has(id)).toBe(false);
  });

  it("end() should return null if id not found", () => {
    expect(performanceTracker.end("fake-id")).toBeNull();
  });

  // it("getAverageDuration() should return correct average", () => {
  //   // Isolate this test by clearing metrics
  //   performanceTracker.metrics.clear();
  //
  //   // Start two operations
  //   const id1 = performanceTracker.start("avgOp");
  //   const id2 = performanceTracker.start("avgOp");
  //
  //   // Manually set durations to simulate completed operations
  //   const metric1 = performanceTracker.metrics.get(id1);
  //   const metric2 = performanceTracker.metrics.get(id2);
  //   expect(metric1).toBeDefined();
  //   expect(metric2).toBeDefined();
  //
  //   if (metric1) {
  //     metric1.duration = 100;
  //     metric1.endTime = metric1.startTime + 100;
  //   }
  //   if (metric2) {
  //     metric2.duration = 200;
  //     metric2.endTime = metric2.startTime + 200;
  //   }
  //
  //   // Calculate expected average: (100 + 200) / 2 = 150
  //   expect(performanceTracker.getAverageDuration("avgOp")).toBe(150);
  // });

  it("getAverageDuration() should return 0 if no durations", () => {
    expect(performanceTracker.getAverageDuration("none")).toBe(0);
  });
});

describe("performanceTracker singleton", () => {
  it("should be an instance of PerformanceTracker", () => {
    // @ts-expect-error: class is not exported
    expect(performanceTracker.constructor.name).toBe("PerformanceTracker");
  });
});

describe("trackPerformance decorator", () => {
  beforeEach(() => {
    // @ts-expect-error: clear private metrics for test isolation
    performanceTracker.metrics.clear();
  });

  // Note: TypeScript may warn about the decorator signature, but it works at runtime and is covered.
  it("should track and log performance for decorated async method", async () => {
    class TestClass {
      async doSomething(arg: Record<string, unknown>) {
        return `done-${JSON.stringify(arg)}`;
      }
    }
    // Manually apply the decorator
    const descriptor = Object.getOwnPropertyDescriptor(
      TestClass.prototype,
      "doSomething"
    )!;
    trackPerformance("decoratorOp")(
      TestClass.prototype,
      "doSomething",
      descriptor
    );
    Object.defineProperty(TestClass.prototype, "doSomething", descriptor);
    const instance = new TestClass();
    const result = await instance.doSomething({ data: { noteId: "n1" } });
    expect(result).toBe("done-" + JSON.stringify({ data: { noteId: "n1" } }));
    // The log should have been called
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("decoratorOp took ")
    );
  });

  it("should still end tracking and log if decorated method throws", async () => {
    class TestClass {
      async failMethod(_arg: Record<string, unknown>) {
        throw new Error("fail");
      }
    }
    // Manually apply the decorator
    const descriptor = Object.getOwnPropertyDescriptor(
      TestClass.prototype,
      "failMethod"
    )!;
    trackPerformance("errorOp")(TestClass.prototype, "failMethod", descriptor);
    Object.defineProperty(TestClass.prototype, "failMethod", descriptor);
    const instance = new TestClass();
    await expect(
      instance.failMethod({ data: { noteId: "n2" } })
    ).rejects.toThrow("fail");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("errorOp took ")
    );
  });
});

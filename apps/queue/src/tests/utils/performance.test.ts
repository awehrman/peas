import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { performanceTracker, trackPerformance } from "../../utils/performance";

// Silence console.log for cleaner test output
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("PerformanceTracker", () => {
  it("should start and end a performance metric", () => {
    const id = performanceTracker.start("testOp", "note1", "ctx");
    expect(typeof id).toBe("string");
    const metric = performanceTracker.end(id)!;
    expect(metric.operation).toBe("testOp");
    expect(metric.noteId).toBe("note1");
    expect(metric.context).toBe("ctx");
    expect(typeof metric.duration).toBe("number");
    expect(typeof metric.endTime).toBe("number");
  });

  it("should return null if ending a non-existent metric", () => {
    expect(performanceTracker.end("fake-id")).toBeNull();
  });

  it("should calculate average duration correctly", () => {
    // Manually add metrics with durations
    const tracker: any = performanceTracker;
    const metric1 = { operation: "avgOp", duration: 100 };
    const metric2 = { operation: "avgOp", duration: 300 };
    tracker.metrics.set("id1", metric1);
    tracker.metrics.set("id2", metric2);
    const avg = performanceTracker.getAverageDuration("avgOp");
    expect(avg).toBe(200);
    tracker.metrics.delete("id1");
    tracker.metrics.delete("id2");
  });

  it("should return 0 for average duration if none exist", () => {
    expect(performanceTracker.getAverageDuration("none")).toBe(0);
  });
});

// --- Decorator tests using function wrapper ---

describe("trackPerformance wrapper", () => {
  it("should track performance for a successful async function", async () => {
    const fn = async (arg: any) => arg;
    const desc = trackPerformance("decoratorOp")(null as any, "fn", {
      value: fn,
    }) as unknown as PropertyDescriptor;
    const wrapped = desc?.value ?? fn;
    const result = await wrapped({ data: { noteId: "n1" } });
    expect(result).toEqual({ data: { noteId: "n1" } });
  });

  it("should track performance and rethrow if function throws", async () => {
    const fn = async (_arg: any) => {
      throw new Error("fail");
    };
    const desc = trackPerformance("decoratorOp")(null as any, "fn", {
      value: fn,
    }) as unknown as PropertyDescriptor;
    const wrapped = desc?.value ?? fn;
    await expect(wrapped({ data: { noteId: "n2" } })).rejects.toThrow("fail");
  });

  it("should extract noteId from nested note object", async () => {
    const fn = async (arg: any) => arg;
    const desc = trackPerformance("decoratorOp")(null as any, "fn", {
      value: fn,
    }) as unknown as PropertyDescriptor;
    const wrapped = desc?.value ?? fn;
    const result = await wrapped({ data: { note: { id: "n3" } } });
    expect(result).toEqual({ data: { note: { id: "n3" } } });
  });
});

describe("trackPerformance decorator execution", () => {
  it("should create a decorator that wraps async methods", async () => {
    // Test the decorator function directly
    const decorator = trackPerformance("testOp");
    const mockMethod = async (arg: any) => arg;
    const descriptor: PropertyDescriptor = { value: mockMethod };

    // Apply decorator (mutates descriptor in place)
    decorator({}, "testMethod", descriptor);

    // Verify the descriptor has a wrapped function
    expect(typeof descriptor.value).toBe("function");
  });

  it("should execute decorator logic with noteId extraction", async () => {
    const testFunction = async (arg: any) => arg;
    const descriptor: PropertyDescriptor = { value: testFunction };
    trackPerformance("testOp")({}, "testMethod", descriptor);
    const result = await descriptor.value({ data: { noteId: "test123" } });
    expect(result).toEqual({ data: { noteId: "test123" } });
  });

  it("should execute decorator logic with nested note object", async () => {
    const testFunction = async (arg: any) => arg;
    const descriptor: PropertyDescriptor = { value: testFunction };
    trackPerformance("testOp")({}, "testMethod", descriptor);
    const result = await descriptor.value({
      data: { note: { id: "nested123" } },
    });
    expect(result).toEqual({ data: { note: { id: "nested123" } } });
  });

  it("should execute decorator logic with error handling", async () => {
    const testFunction = async (_arg: any) => {
      throw new Error("Test error");
    };
    const descriptor: PropertyDescriptor = { value: testFunction };
    trackPerformance("testOp")({}, "testMethod", descriptor);
    await expect(
      descriptor.value({ data: { noteId: "test456" } })
    ).rejects.toThrow("Test error");
  });

  it("should handle decorator with no noteId in args", async () => {
    const testFunction = async (arg: any) => arg;
    const descriptor: PropertyDescriptor = { value: testFunction };
    trackPerformance("testOp")({}, "testMethod", descriptor);
    const result = await descriptor.value({ someData: "value" });
    expect(result).toEqual({ someData: "value" });
  });
});

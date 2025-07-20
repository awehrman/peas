import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { trackPerformance } from "../../performance";

// Helper to silence console.log during tests
let consoleSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  consoleSpy.mockRestore();
});

describe("trackPerformance decorator", () => {
  beforeEach(() => {
    // Clear private metrics for test isolation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Access private property for test
    (global as any).performanceTracker?.metrics?.clear();
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

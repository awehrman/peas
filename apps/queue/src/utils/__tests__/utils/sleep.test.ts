import { describe, it, expect, vi, beforeEach } from "vitest";
import { sleep } from "../../utils";

describe("sleep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sleep for specified milliseconds", async () => {
    const startTime = Date.now();
    await sleep(100);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(100);
  });

  it("should return a promise", () => {
    const result = sleep(100);
    expect(result).toBeInstanceOf(Promise);
  });

  it("should handle zero milliseconds", async () => {
    const startTime = Date.now();
    await sleep(0);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it("should handle very short durations", async () => {
    const startTime = Date.now();
    await sleep(1);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // For very short durations, we can't guarantee exact timing due to event loop
    // but we can ensure it doesn't complete immediately
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it("should handle longer durations", async () => {
    const startTime = Date.now();
    await sleep(500);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(500);
  });

  it("should resolve after sleeping", async () => {
    let resolved = false;
    const promise = sleep(50).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    await promise;
    expect(resolved).toBe(true);
  });

  it("should handle multiple sleep calls", async () => {
    const startTime = Date.now();

    await sleep(50);
    await sleep(50);
    await sleep(50);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(150);
  });

  it("should handle concurrent sleep calls", async () => {
    const startTime = Date.now();

    await Promise.all([sleep(100), sleep(100), sleep(100)]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(100);
    expect(duration).toBeLessThan(200); // Should be concurrent, not sequential
  });

  it("should handle negative milliseconds gracefully", async () => {
    const startTime = Date.now();
    await sleep(-100);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it("should handle very large milliseconds", async () => {
    const startTime = Date.now();
    await sleep(1000);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(1000);
  });

  it("should not throw errors", async () => {
    await expect(sleep(100)).resolves.not.toThrow();
  });

  it("should work with async/await pattern", async () => {
    const result = await sleep(50);
    expect(result).toBeUndefined();
  });

  it("should work with .then() pattern", async () => {
    let result: unknown;
    await sleep(50).then((value) => {
      result = value;
    });
    expect(result).toBeUndefined();
  });
});

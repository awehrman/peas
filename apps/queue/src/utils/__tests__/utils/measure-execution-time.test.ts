import { beforeEach, describe, expect, it, vi } from "vitest";

import { measureExecutionTime } from "../../utils";

describe("measureExecutionTime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should measure execution time and return result", async () => {
    const operation = vi.fn().mockResolvedValue("test result");

    const result = await measureExecutionTime(operation);

    expect(result).toEqual({
      result: "test result",
      duration: expect.any(Number),
    });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("should log execution time when operation name is provided", async () => {
    const operation = vi.fn().mockResolvedValue("test result");
    const consoleSpy = vi.spyOn(console, "log");

    await measureExecutionTime(operation, "Test Operation");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Test Operation completed in \d+ms/)
    );
  });

  it("should not log when operation name is not provided", async () => {
    const operation = vi.fn().mockResolvedValue("test result");
    const consoleSpy = vi.spyOn(console, "log");

    await measureExecutionTime(operation);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("should handle async operations that take time", async () => {
    const delayedOperation = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "delayed result";
    };

    const result = await measureExecutionTime(delayedOperation);

    expect(result.result).toBe("delayed result");
    expect(result.duration).toBeGreaterThanOrEqual(9); // Allow for timing precision
  });

  it("should handle operations that return different types", async () => {
    const stringOperation = vi.fn().mockResolvedValue("string result");
    const numberOperation = vi.fn().mockResolvedValue(42);
    const objectOperation = vi.fn().mockResolvedValue({ key: "value" });
    const arrayOperation = vi.fn().mockResolvedValue([1, 2, 3]);

    const stringResult = await measureExecutionTime(stringOperation);
    const numberResult = await measureExecutionTime(numberOperation);
    const objectResult = await measureExecutionTime(objectOperation);
    const arrayResult = await measureExecutionTime(arrayOperation);

    expect(stringResult.result).toBe("string result");
    expect(numberResult.result).toBe(42);
    expect(objectResult.result).toEqual({ key: "value" });
    expect(arrayResult.result).toEqual([1, 2, 3]);
  });

  it("should handle operations that throw errors", async () => {
    const errorOperation = vi.fn().mockRejectedValue(new Error("Test error"));

    await expect(measureExecutionTime(errorOperation)).rejects.toThrow(
      "Test error"
    );
  });

  it("should measure duration accurately", async () => {
    const startTime = Date.now();
    const operation = vi.fn().mockResolvedValue("result");

    const result = await measureExecutionTime(operation);
    const endTime = Date.now();

    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 10); // Allow some tolerance
  });

  it("should handle empty string operation name", async () => {
    const operation = vi.fn().mockResolvedValue("test result");
    const consoleSpy = vi.spyOn(console, "log");

    await measureExecutionTime(operation, "");

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("should handle null operation name", async () => {
    const operation = vi.fn().mockResolvedValue("test result");
    const consoleSpy = vi.spyOn(console, "log");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test edge case
    await measureExecutionTime(operation, null as any);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("should handle undefined operation name", async () => {
    const operation = vi.fn().mockResolvedValue("test result");
    const consoleSpy = vi.spyOn(console, "log");

    await measureExecutionTime(operation, undefined);

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

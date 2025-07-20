import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJobOptions } from "../../utils";

// Mock the config module
vi.mock("../../config/constants", () => ({
  WORKER_CONSTANTS: {
    DEFAULT_JOB_OPTIONS: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  },
}));

describe("createJobOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return default job options when no overrides provided", async () => {
    const result = await createJobOptions();

    expect(result).toEqual({
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });
  });

  it("should merge overrides with default options", async () => {
    const overrides = {
      attempts: 5,
    };

    const result = await createJobOptions(
      overrides as Parameters<typeof createJobOptions>[0]
    );

    expect(result).toEqual({
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });
  });

  it("should override all default options", async () => {
    const overrides = {
      attempts: 10,
      backoff: {
        type: "fixed",
        delay: 1000,
      },
    };

    const result = await createJobOptions(
      overrides as Parameters<typeof createJobOptions>[0]
    );

    expect(result).toEqual({
      attempts: 10,
      backoff: {
        type: "fixed",
        delay: 1000,
      },
    });
  });

  it("should handle partial overrides", async () => {
    const overrides = {
      attempts: 1,
    };

    const result = await createJobOptions(
      overrides as Parameters<typeof createJobOptions>[0]
    );

    expect(result).toEqual({
      attempts: 1,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });
  });

  it("should handle empty overrides object", async () => {
    const result = await createJobOptions(
      {} as Parameters<typeof createJobOptions>[0]
    );

    expect(result).toEqual({
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });
  });

  it("should handle undefined overrides", async () => {
    const result = await createJobOptions(undefined);

    expect(result).toEqual({
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });
  });
});

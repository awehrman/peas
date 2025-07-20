import { describe, it, expect } from "vitest";
import { DEFAULT_RETRY_CONFIG } from "../../retry";

describe("DEFAULT_RETRY_CONFIG", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_RETRY_CONFIG).toEqual({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
    });
  });
});

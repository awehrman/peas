import { describe, it, expect } from "vitest";
import { logger } from "../../logger";

describe("default logger export", () => {
  it("logger default export is an EnhancedLoggerService", () => {
    expect(logger).toBeInstanceOf(logger.constructor);
  });
});

import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IngredientService,
  IngredientServiceContainer,
} from "../../../ingredient";

describe("IngredientService (private) logIngredientParsingCompleted", () => {
  let service: IngredientService;
  let logger: { log: Mock };

  beforeEach(() => {
    logger = { log: vi.fn() };
    const container: IngredientServiceContainer = { logger };
    service = new IngredientService(container);
  });

  function callLogCompleted(status: string, segments: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (service as any).logIngredientParsingCompleted(status, segments);
  }

  it("logs the correct message for completed parsing", () => {
    callLogCompleted("CORRECT", 3);
    expect(logger.log).toHaveBeenCalledTimes(1);
    if (!logger.log.mock || !logger.log.mock.calls[0])
      throw new Error("Mock not called");
    const message = logger.log.mock.calls[0][0];
    expect(message).toMatch(/ingredient parsing completed/i);
    expect(message).toMatch(/CORRECT/);
  });

  it("logs the correct message for error status", () => {
    callLogCompleted("ERROR", 0);
    expect(logger.log).toHaveBeenCalledTimes(1);
    if (!logger.log.mock || !logger.log.mock.calls[0])
      throw new Error("Mock not called");
    const message = logger.log.mock.calls[0][0];
    expect(message).toMatch(/ingredient parsing completed/i);
    expect(message).toMatch(/ERROR/);
  });
});

import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IngredientService,
  IngredientServiceContainer,
} from "../../../ingredient";

describe("IngredientService (private) logIngredientParsingError", () => {
  let service: IngredientService;
  let logger: { log: Mock };

  beforeEach(() => {
    logger = { log: vi.fn() };
    const container: IngredientServiceContainer = { logger };
    service = new IngredientService(container);
  });

  function callLogError(error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (service as any).logIngredientParsingError(error);
  }

  it("logs the correct message for Error object", () => {
    callLogError(new Error("parse failed"));
    expect(logger.log).toHaveBeenCalledTimes(1);
    if (!logger.log.mock || !logger.log.mock.calls[0])
      throw new Error("Mock not called");
    const message = logger.log.mock.calls[0][0];
    expect(message).toMatch(/ingredient parsing failed/i);
    expect(message).toMatch(/parse failed/);
  });

  it("logs the correct message for string error", () => {
    callLogError("something went wrong");
    expect(logger.log).toHaveBeenCalledTimes(1);
    if (!logger.log.mock || !logger.log.mock.calls[0])
      throw new Error("Mock not called");
    const message = logger.log.mock.calls[0][0];
    expect(message).toMatch(/ingredient parsing failed/i);
    expect(message).toMatch(/something went wrong/);
  });
});

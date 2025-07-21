import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IngredientService,
  IngredientServiceContainer,
} from "../../../ingredient";

describe("IngredientService (private) logIngredientParsingStart", () => {
  let service: IngredientService;
  let logger: { log: Mock };

  beforeEach(() => {
    logger = { log: vi.fn() };
    const container: IngredientServiceContainer = { logger };
    service = new IngredientService(container);
  });

  function callLogStart() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (service as any).logIngredientParsingStart();
  }

  it("logs the correct start message", () => {
    callLogStart();
    expect(logger.log).toHaveBeenCalledTimes(1);
    if (!logger.log.mock || !logger.log.mock.calls[0])
      throw new Error("Mock not called");
    const message = logger.log.mock.calls[0][0];
    expect(message).toMatch(/parsing ingredient/i);
  });
});

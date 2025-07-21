import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IngredientService,
  IngredientServiceContainer,
} from "../../ingredient";

describe("IngredientService.parseIngredient", () => {
  let service: IngredientService;
  let container: IngredientServiceContainer;
  let logger: { log: Mock };

  beforeEach(() => {
    logger = { log: vi.fn() };
    container = { logger };
    service = new IngredientService(container);
    vi.clearAllMocks();
  });

  it("returns error for empty input", async () => {
    const result = await service.parseIngredient("");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/empty/i);
    expect(logger.log).toHaveBeenCalled();
  });

  it("returns error for parser error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, "importIngredientParser").mockImplementationOnce(
      () => {
        throw new Error("fail");
      }
    );
    const result = await service.parseIngredient("sugar");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/fail/);
    expect(logger.log).toHaveBeenCalled();
  });

  it("returns segments for valid input", async () => {
    const fakeParser = {
      parse: vi.fn(() => ({
        values: [{ rule: "ingredient", type: "ingredient", value: "sugar" }],
      })),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, "importIngredientParser").mockResolvedValue(
      fakeParser
    );
    const result = await service.parseIngredient("sugar");
    expect(result.success).toBe(true);
    if (result.segments) {
      expect(result.segments[0]?.value).toBe("sugar");
    } else {
      throw new Error("segments should be defined");
    }
    expect(logger.log).toHaveBeenCalled();
  });
});

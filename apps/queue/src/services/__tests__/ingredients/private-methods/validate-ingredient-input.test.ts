import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IngredientService,
  IngredientServiceContainer,
} from "../../../ingredient";

describe("IngredientService (private) validateIngredientInput", () => {
  let service: IngredientService;

  beforeEach(() => {
    const logger: { log: Mock } = { log: vi.fn() };
    const container: IngredientServiceContainer = { logger };
    service = new IngredientService(container);
  });

  function callValidate(text: string): string | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (service as any).validateIngredientInput(text);
  }

  it("returns null for valid input", () => {
    expect(callValidate("sugar")).toBeNull();
    expect(callValidate("  flour  ")).toBeNull();
  });

  it("returns error message for empty or whitespace input", () => {
    expect(callValidate("")).toMatch(/empty or invalid/i);
    expect(callValidate("   ")).toMatch(/empty or invalid/i);
    expect(callValidate(null as unknown as string)).toMatch(
      /empty or invalid/i
    );
    expect(callValidate(undefined as unknown as string)).toMatch(
      /empty or invalid/i
    );
  });
});

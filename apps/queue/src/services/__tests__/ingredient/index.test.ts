import { describe, expect, it } from "vitest";

import { registerIngredientActions } from "../../ingredient/index";

describe("Ingredient Service Index", () => {
  it("should export registerIngredientActions function", () => {
    expect(typeof registerIngredientActions).toBe("function");
  });

  it("should have the correct function signature", () => {
    expect(registerIngredientActions).toBeDefined();
    expect(registerIngredientActions.name).toBe("registerIngredientActions");
  });

  it("should be the same function as the one from register module", async () => {
    const { registerIngredientActions: registerFunction } = await import(
      "../../ingredient/register"
    );
    expect(registerIngredientActions).toBe(registerFunction);
  });
});

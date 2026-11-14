import { describe, expect, it } from "vitest";

import { UNIT_TABLE, createUnitMatcher } from "../quantity/units.js";

function unitAt(text: string, offset = 0) {
  return createUnitMatcher(text).matchAt(offset);
}

describe("unit matcher", () => {
  it("prefers the longest spelling", () => {
    expect(unitAt("fluid ounces of milk")).toMatchObject({
      id: "fl_oz",
      length: 12,
    });
    expect(unitAt("fl oz milk")).toMatchObject({ id: "fl_oz" });
    expect(unitAt("tablespoons")).toMatchObject({ id: "tbsp", length: 11 });
  });

  it("consumes an abbreviation period only when it ends the word", () => {
    expect(unitAt("tbsp. sugar")).toMatchObject({ id: "tbsp", length: 5 });
    expect(unitAt("oz.")).toMatchObject({ id: "oz", length: 3 });
  });

  it("distinguishes T (tablespoon) from t (teaspoon)", () => {
    expect(unitAt("T sugar")).toMatchObject({ id: "tbsp" });
    expect(unitAt("t salt")).toMatchObject({ id: "tsp" });
  });

  it("requires word boundaries", () => {
    expect(unitAt("carrots")).toBeNull();
    expect(unitAt("t-bone")).toBeNull();
    expect(unitAt("cupcake")).toBeNull();
    expect(unitAt("xcup", 1)).toBeNull();
  });

  it("allows a unit glued to a number", () => {
    const text = "250ml stock";
    expect(createUnitMatcher(text).matchAt(3)).toMatchObject({
      id: "ml",
      length: 2,
    });
  });

  it("lets a single-letter unit end one side of a range", () => {
    expect(createUnitMatcher("800g-1kg").matchAt(3)).toMatchObject({
      id: "g",
      length: 1,
    });
    expect(createUnitMatcher("2 t-bone steaks").matchAt(2)).toBeNull();
  });

  it("reports dimensions", () => {
    expect(unitAt("cans")).toMatchObject({ id: "can", dimension: "PACKAGE" });
    expect(unitAt("cloves")).toMatchObject({ id: "clove", dimension: "COUNT" });
    expect(unitAt("kg")).toMatchObject({ id: "kg", dimension: "MASS" });
    expect(unitAt("racks")).toMatchObject({ id: "rack", dimension: "COUNT" });
    expect(unitAt("slab")).toMatchObject({ id: "slab", dimension: "COUNT" });
    expect(unitAt("recipe")).toMatchObject({
      id: "recipe",
      dimension: "COUNT",
    });
  });

  it("keeps food parts out of the unit table", () => {
    const ids = new Set(UNIT_TABLE.map((unit) => unit.id));
    for (const foodPart of [
      "thigh",
      "breast",
      "zest",
      "juice",
      "leaf",
      "seed",
    ]) {
      expect(ids.has(foodPart)).toBe(false);
    }
  });
});

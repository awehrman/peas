import { describe, expect, it } from "vitest";

import type { IngredientSummary } from "../../types";
import {
  NAME_BUCKET_THRESHOLD,
  getReferenceCountBucket,
  groupIngredients,
} from "../group-ingredients";

function makeIngredient(overrides: Partial<IngredientSummary>): IngredientSummary {
  return {
    id: overrides.name ?? "id",
    name: "apple",
    plural: null,
    isReviewed: false,
    parentIngredientId: null,
    properties: [],
    referenceCount: 0,
    ...overrides,
  };
}

describe("groupIngredients", () => {
  it("puts a small list into one alphabetized group when grouping by name", () => {
    const groups = groupIngredients(
      [makeIngredient({ name: "pear" }), makeIngredient({ name: "apple" })],
      "name"
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("All Ingredients");
    expect(groups[0]?.ingredients.map((i) => i.name)).toEqual(["apple", "pear"]);
  });

  it("buckets by first letter once the list reaches the threshold, with non-letters last", () => {
    const ingredients = Array.from({ length: NAME_BUCKET_THRESHOLD }, (_, index) =>
      makeIngredient({ id: `id-${index}`, name: index % 2 === 0 ? `basil ${index}` : `apple ${index}` })
    );
    ingredients.push(makeIngredient({ id: "digit", name: "7up" }));

    const labels = groupIngredients(ingredients, "name").map((group) => group.label);

    expect(labels).toEqual(["A", "B", "#"]);
  });

  it("places an ingredient in every property group it has, and others under No Properties", () => {
    const groups = groupIngredients(
      [
        makeIngredient({ name: "milk", properties: ["DAIRY", "VEGETARIAN"] }),
        makeIngredient({ name: "salt" }),
      ],
      "property"
    );

    expect(groups.map((group) => group.label)).toEqual(["Vegetarian", "Dairy", "No Properties"]);
    expect(groups[2]?.ingredients.map((i) => i.name)).toEqual(["salt"]);
  });

  it("separates top-level ingredients from variants", () => {
    const groups = groupIngredients(
      [
        makeIngredient({ name: "granny smith", parentIngredientId: "apple-id" }),
        makeIngredient({ name: "apple" }),
      ],
      "relationship"
    );

    expect(groups.map((group) => [group.label, group.ingredients.length])).toEqual([
      ["Top Level Ingredients", 1],
      ["Variants", 1],
    ]);
  });
});

describe("getReferenceCountBucket", () => {
  it.each([
    [0, "0 References"],
    [1, "1 Reference"],
    [2, "2 References"],
    [3, "3 - 10 References"],
    [10, "3 - 10 References"],
    [11, "11 - 20 References"],
    [20, "11 - 20 References"],
    [21, "21 - 30 References"],
    [30, "21 - 30 References"],
    [31, "31 - 40 References"],
  ])("puts %i references in %s", (count, label) => {
    expect(getReferenceCountBucket(count).label).toBe(label);
  });
});

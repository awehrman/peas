import { describe, expect, it } from "vitest";

import {
  graphSearchSchema,
  graphSearchString,
  occurrenceSearchSchema,
  toGraphOptions,
  toGraphSearch,
  toOccurrenceFilters,
  toOccurrenceSearch,
} from "../explorer-search";

describe("occurrence search params", () => {
  it("round-trips filters and drops a review status while review mentions are off", () => {
    const search = occurrenceSearchSchema.parse({
      madeFrom: 1,
      prep: "dice",
      attr: "bone:boneless",
      status: "NEEDS_REVIEW",
    });
    const filters = toOccurrenceFilters(search);
    expect(filters).toEqual({
      includeMadeFrom: true,
      includeNeedsReview: false,
      preparationKey: "dice",
      attribute: "bone:boneless",
      sourceId: undefined,
      categoryId: undefined,
      status: undefined,
    });
    expect(
      toOccurrenceFilters({ review: true, status: "NEEDS_REVIEW" }).status
    ).toBe("NEEDS_REVIEW");
    expect(
      toOccurrenceSearch({ ...filters, includeMadeFrom: false, sourceId: "s1" })
    ).toEqual({
      madeFrom: undefined,
      review: undefined,
      prep: "dice",
      attr: "bone:boneless",
      source: "s1",
      category: undefined,
      status: undefined,
    });
    expect(
      occurrenceSearchSchema.parse({ status: "BOGUS" }).status
    ).toBeUndefined();
  });
});

describe("graph search params", () => {
  it("defaults to every type, two steps, both ways, and keeps defaults out of the URL", () => {
    const options = toGraphOptions(graphSearchSchema.parse({}));
    expect(options).toEqual({
      depth: 2,
      types: ["IS_A", "PART_OF", "DERIVED_FROM", "PROCESSED_FROM"],
      direction: "BOTH",
    });
    expect(graphSearchString(toGraphSearch(options))).toBe("");
  });

  it("reads and writes narrowed options, keeping 'none' when every type is off", () => {
    const options = toGraphOptions(
      graphSearchSchema.parse({
        depth: "3",
        types: "PART_OF,BOGUS,IS_A",
        dir: "UP",
      })
    );
    expect(options).toEqual({
      depth: 3,
      types: ["IS_A", "PART_OF"],
      direction: "UP",
    });
    expect(graphSearchString(toGraphSearch(options))).toBe(
      "?depth=3&types=IS_A%2CPART_OF&dir=UP"
    );
    expect(toGraphSearch({ ...options, types: [] }).types).toBe("none");
    expect(toGraphOptions({ types: "none" }).types).toEqual([]);
    expect(graphSearchSchema.parse({ depth: 9 }).depth).toBeUndefined();
  });
});

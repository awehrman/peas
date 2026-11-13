import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  optionalEnum,
  optionalFlag,
  optionalPage,
  optionalText,
} from "../search";

const schema = z.object({
  q: optionalText,
  page: optionalPage,
  type: optionalEnum(["UNKNOWN_FOOD_PHRASE", "AMBIGUOUS_MATCH"] as const),
});

describe("search params", () => {
  it("keeps valid values and coerces numeric text back to strings", () => {
    expect(
      schema.parse({ q: 123, page: "2", type: "AMBIGUOUS_MATCH" })
    ).toEqual({ q: "123", page: 2, type: "AMBIGUOUS_MATCH" });
  });

  it("falls back to no filter for empty or malformed values instead of throwing", () => {
    expect(schema.parse({ q: "", page: "x", type: "NOPE" })).toEqual({
      q: undefined,
      page: undefined,
      type: undefined,
    });
    expect(schema.parse({ q: null, page: -1 })).toEqual({
      q: undefined,
      page: undefined,
      type: undefined,
    });
  });

  it("reads a flag from the number or boolean the router hands over, and anything else as off", () => {
    for (const on of [1, true, "1", "true"])
      expect(optionalFlag.parse(on)).toBe(true);
    for (const off of [undefined, 0, false, "no", null])
      expect(optionalFlag.parse(off)).toBeUndefined();
  });
});

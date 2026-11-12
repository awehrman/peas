import { describe, expect, it } from "vitest";

import {
  addRational,
  formatRational,
  parseRational,
  rational,
  rationalToNumber,
} from "../quantity/rational.js";

describe("rational", () => {
  it("reduces and normalizes the sign", () => {
    expect(rational(6, 8)).toEqual({ numerator: 3, denominator: 4 });
    expect(rational(1, -2)).toEqual({ numerator: -1, denominator: 2 });
    expect(rational(0, 5)).toEqual({ numerator: 0, denominator: 1 });
  });

  it("rejects zero denominators and non-integers", () => {
    expect(() => rational(1, 0)).toThrow();
    expect(() => rational(1.5, 2)).toThrow();
  });

  it("parses integers, fractions, mixed numbers, and decimals exactly", () => {
    expect(parseRational("3")).toEqual(rational(3));
    expect(parseRational("1/2")).toEqual(rational(1, 2));
    expect(parseRational("1 1/2")).toEqual(rational(3, 2));
    expect(parseRational("1-1/2")).toEqual(rational(3, 2));
    expect(parseRational("1.5")).toEqual(rational(3, 2));
    expect(parseRational("1,5")).toEqual(rational(3, 2));
    expect(parseRational(".25")).toEqual(rational(1, 4));
    expect(() => parseRational("one")).toThrow();
  });

  it("adds and formats without floating-point drift", () => {
    const third = rational(1, 3);
    expect(addRational(addRational(third, third), third)).toEqual(rational(1));
    expect(formatRational(rational(3, 2))).toBe("1 1/2");
    expect(formatRational(rational(1, 8))).toBe("1/8");
    expect(rationalToNumber(rational(1, 4))).toBe(0.25);
  });
});

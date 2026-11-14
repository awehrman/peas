import { describe, expect, it } from "vitest";

import {
  padSimHash,
  simHashBands,
  simHashDistance,
  simHashSimilarity,
} from "../simhash.js";

function randomHash(seed: number): string {
  let value = seed >>> 0;
  let bits = "";
  for (let index = 0; index < 32; index++) {
    value = (value * 1103515245 + 12345) >>> 0;
    bits += (value >>> 16) & 1 ? "1" : "0";
  }
  return bits;
}

function flipBits(hash: string, positions: number[]): string {
  const bits = hash.split("");
  for (const position of positions) bits[position] = bits[position] === "1" ? "0" : "1";
  return bits.join("");
}

describe("padSimHash", () => {
  it("restores leading zeros lost by toString(2)", () => {
    expect(padSimHash("101")).toBe(`${"0".repeat(29)}101`);
    expect(padSimHash("1".repeat(32))).toBe("1".repeat(32));
  });
});

describe("simHashBands", () => {
  it("splits a hash into four tagged 8-bit bands", () => {
    expect(simHashBands(`00000001${"1".repeat(8)}${"0".repeat(16)}`)).toEqual([
      "0:01",
      "1:ff",
      "2:00",
      "3:00",
    ]);
  });

  it("pads before banding and returns nothing for an empty hash", () => {
    expect(simHashBands("1")).toEqual(["0:00", "1:00", "2:00", "3:01"]);
    expect(simHashBands("")).toEqual([]);
  });

  it("guarantees a shared band for every pair within Hamming distance 3", () => {
    for (let seed = 1; seed < 200; seed++) {
      const hash = randomHash(seed);
      const positions = [seed % 32, (seed * 7) % 32, (seed * 13) % 32];
      const near = flipBits(hash, positions);
      expect(simHashDistance(hash, near)).toBeLessThanOrEqual(3);
      const shared = simHashBands(hash).filter((band) => simHashBands(near).includes(band));
      expect(shared.length).toBeGreaterThan(0);
    }
  });
});

describe("simHashDistance and simHashSimilarity", () => {
  it("compares unpadded legacy hashes with padded ones", () => {
    expect(simHashDistance("1", padSimHash("1"))).toBe(0);
    expect(simHashDistance("1", "11")).toBe(1);
  });

  it("treats a missing hash as infinitely far", () => {
    expect(simHashDistance("", "1")).toBe(Number.MAX_SAFE_INTEGER);
    expect(simHashSimilarity("", "1")).toBe(0);
  });

  it("scores one differing bit of 32", () => {
    expect(simHashSimilarity("0", "1")).toBeCloseTo(31 / 32);
  });
});

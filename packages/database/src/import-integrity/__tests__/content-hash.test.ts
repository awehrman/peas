import { describe, expect, it } from "vitest";

import { computeContentHash, computeRawHtmlHash, normalizeSourceText } from "../content-hash.js";

describe("computeContentHash", () => {
  const base = { title: "Chili", ingredientLines: ["1 onion", "2 lb beef"], instructionLines: ["Simmer."] };

  it("ignores case, spacing, and Unicode width differences", () => {
    expect(
      computeContentHash({
        title: "  CHILI ",
        ingredientLines: ["1\u00a0onion", "2 lb  beef"],
        instructionLines: ["simmer."],
      })
    ).toBe(computeContentHash(base));
  });

  it("changes when content or order changes", () => {
    expect(computeContentHash({ ...base, ingredientLines: ["2 lb beef", "1 onion"] })).not.toBe(computeContentHash(base));
    expect(computeContentHash({ ...base, title: "Chili II" })).not.toBe(computeContentHash(base));
  });

  it("never matches empty notes to each other", () => {
    expect(computeContentHash({ title: "Untitled", ingredientLines: [], instructionLines: [" "] })).toBeNull();
  });
});

describe("computeRawHtmlHash", () => {
  it("is exact", () => {
    expect(computeRawHtmlHash("<p>a</p>")).toBe(computeRawHtmlHash("<p>a</p>"));
    expect(computeRawHtmlHash("<p>a</p>")).not.toBe(computeRawHtmlHash("<p>a </p>"));
  });
});

describe("normalizeSourceText", () => {
  it("folds accents, case, and punctuation", () => {
    expect(normalizeSourceText("  The Joy of Cooking — 75th Anniversary ")).toBe(
      "the joy of cooking 75th anniversary"
    );
    expect(normalizeSourceText("Crème Brûlée & Co.")).toBe("creme brulee and co");
  });
});

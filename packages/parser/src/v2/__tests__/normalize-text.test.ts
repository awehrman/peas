import { describe, expect, it } from "vitest";

import { normalizeText } from "../normalize/normalize-text.js";
import { tokenize } from "../normalize/tokenize.js";

describe("normalizeText", () => {
  it("expands vulgar fractions and separates them from a leading digit", () => {
    expect(normalizeText("1½ cups").text).toBe("1 1/2 cups");
    expect(normalizeText("1 ½ cups").text).toBe("1 1/2 cups");
    expect(normalizeText("⅓ cup").text).toBe("1/3 cup");
  });

  it("maps fraction slashes, dashes, quotes, and odd spaces", () => {
    expect(normalizeText("1⁄2 tsp").text).toBe("1/2 tsp");
    expect(normalizeText("2–3 tbsp").text).toBe("2-3 tbsp");
    expect(normalizeText("confectioners’ sugar").text).toBe(
      "confectioners' sugar"
    );
    expect(normalizeText("1\u00A0cup  \t milk ").text).toBe("1 cup milk");
    expect(normalizeText("2 × 400g").text).toBe("2 x 400g");
  });

  it("preserves case, hyphens, and words", () => {
    expect(normalizeText("1 T Non-Fat Milk").text).toBe("1 T Non-Fat Milk");
  });

  it("maps normalized spans back to the raw characters that produced them", () => {
    const raw = "  1½ cups flour";
    const normalized = normalizeText(raw);
    const flourStart = normalized.text.indexOf("flour");

    expect(normalized.toRawSpan(flourStart, flourStart + 5)).toEqual({
      start: 10,
      end: 15,
      text: "flour",
    });
    // "1/2" all comes from the single raw "½"
    const fractionStart = normalized.text.indexOf("1/2");
    expect(normalized.toRawSpan(fractionStart, fractionStart + 3).text).toBe(
      "½"
    );
  });

  it("keeps offsets correct around characters outside the Basic Multilingual Plane", () => {
    const raw = "🍋 2 lemons";
    const normalized = normalizeText(raw);
    const start = normalized.text.indexOf("lemons");
    expect(normalized.toRawSpan(start, start + 6).text).toBe("lemons");
  });
});

describe("tokenize", () => {
  it("splits words, numbers, and punctuation", () => {
    expect(
      tokenize("2 cups flat-leaf parsley, chopped").map((t) => [t.text, t.kind])
    ).toEqual([
      ["2", "NUMBER"],
      ["cups", "WORD"],
      ["flat", "WORD"],
      ["-", "PUNCT"],
      ["leaf", "WORD"],
      ["parsley", "WORD"],
      [",", "PUNCT"],
      ["chopped", "WORD"],
    ]);
  });

  it("keeps internal periods but splits a trailing one", () => {
    expect(tokenize("1.5 tbsp. e.g salt.").map((t) => t.text)).toEqual([
      "1.5",
      "tbsp",
      ".",
      "e.g",
      "salt",
      ".",
    ]);
  });
});

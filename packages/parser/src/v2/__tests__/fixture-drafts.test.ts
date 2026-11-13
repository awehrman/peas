import { describe, expect, it } from "vitest";

import { draftGoldenCases, fixtureSlug } from "../knowledge/fixture-drafts";

describe("fixtureSlug", () => {
  it("turns signatures into file-name-safe slugs", () => {
    expect(fixtureSlug("N - x - N - U W")).toBe("n-x-n-u-w");
    expect(fixtureSlug("W :")).toBe("w-colon");
    expect(fixtureSlug("N ( N U ) W")).toBe("n-open-n-u-close-w");
    expect(fixtureSlug("N / N , W")).toBe("n-slash-n-comma-w");
    expect(fixtureSlug("")).toBe("structure");
  });
});

describe("draftGoldenCases", () => {
  it("numbers distinct lines as pending cases with empty expected values", () => {
    const cases = draftGoldenCases("W U", [
      { input: "rosemary a few sprigs", current: "rosemary a few sprigs" },
      { input: "thyme a few sprigs" },
      { input: "rosemary a few sprigs" },
    ]);

    expect(cases).toEqual([
      {
        id: "pending-w-u-1",
        input: "rosemary a few sprigs",
        tags: ["pending"],
        current: "rosemary a few sprigs",
        expected: { status: "PARSED", segments: [] },
      },
      {
        id: "pending-w-u-2",
        input: "thyme a few sprigs",
        tags: ["pending"],
        expected: { status: "PARSED", segments: [] },
      },
    ]);
  });

  it("returns nothing for no lines", () => {
    expect(draftGoldenCases("W :", [])).toEqual([]);
  });
});

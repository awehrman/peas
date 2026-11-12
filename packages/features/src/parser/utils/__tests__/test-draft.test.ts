import { describe, expect, it } from "vitest";

import { splitReferenceIntoExpectations, validateTestDraft } from "../test-draft";

describe("splitReferenceIntoExpectations", () => {
  it("creates one expectation per word, guessing numbers as amounts", () => {
    expect(splitReferenceIntoExpectations("  1 ½ cups  flour ")).toEqual([
      { type: "amount", value: "1" },
      { type: "amount", value: "½" },
      { type: "ingredient", value: "cups" },
      { type: "ingredient", value: "flour" },
    ]);
  });

  it("returns nothing for a blank line", () => {
    expect(splitReferenceIntoExpectations("   ")).toEqual([]);
  });
});

describe("validateTestDraft", () => {
  it("requires a line and at least one complete expectation", () => {
    expect(validateTestDraft({ reference: "", expectations: [] })).toEqual({
      reference: "Enter the line to test",
      expectations: "Add at least one expected segment",
    });
    expect(
      validateTestDraft({ reference: "salt", expectations: [{ type: "ingredient", value: " " }] })
        .expectations
    ).toMatch(/type and a value/);
    expect(
      validateTestDraft({ reference: "salt", expectations: [{ type: "ingredient", value: "salt" }] })
    ).toEqual({});
  });
});

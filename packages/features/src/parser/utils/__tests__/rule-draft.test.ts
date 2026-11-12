import { describe, expect, it } from "vitest";

import {
  createRuleDraft,
  hasRuleDraftErrors,
  renameRuleDraft,
  validateRuleDraft,
} from "../rule-draft";

describe("renameRuleDraft", () => {
  it("updates an auto label and untouched default formatter with the new name", () => {
    const renamed = renameRuleDraft(createRuleDraft(), "amountKeyword");

    expect(renamed.label).toBe("Amount Keyword");
    expect(renamed.definitions[0]?.formatter).toContain("type: 'amountKeyword'");
  });

  it("keeps a hand-written label and an edited formatter", () => {
    const draft = {
      ...createRuleDraft(),
      name: "amount",
      label: "Quantity",
      definitions: [{ type: "RULE" as const, example: "", rule: "digits", formatter: "{ return 1 }", list: [] }],
    };

    const renamed = renameRuleDraft(draft, "amounts");

    expect(renamed.label).toBe("Quantity");
    expect(renamed.definitions[0]?.formatter).toBe("{ return 1 }");
  });
});

describe("validateRuleDraft", () => {
  it("requires a valid, unique Peggy identifier", () => {
    const base = { ...createRuleDraft(), label: "X", definitions: [{ type: "RULE" as const, example: "", rule: "'x'", formatter: "", list: [] }] };

    expect(validateRuleDraft({ ...base, name: "" }, new Set()).name).toBe("Name is required");
    expect(validateRuleDraft({ ...base, name: "2cups" }, new Set()).name).toMatch(/letters/);
    expect(validateRuleDraft({ ...base, name: "unit" }, new Set(["unit"])).name).toMatch(/already exists/);
    expect(hasRuleDraftErrors(validateRuleDraft({ ...base, name: "unit" }, new Set()))).toBe(false);
  });

  it("flags empty rule expressions and empty keyword lists per alternative", () => {
    const errors = validateRuleDraft(
      {
        name: "unit",
        label: "Unit",
        definitions: [
          { type: "RULE", example: "", rule: " ", formatter: "", list: [] },
          { type: "LIST", example: "", rule: "", formatter: "", list: [] },
        ],
      },
      new Set()
    );

    expect(errors.definitions).toEqual({
      0: "Rule expression is required",
      1: "Add at least one keyword",
    });
  });
});

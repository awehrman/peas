import { describe, expect, it } from "vitest";

import { buildResolverContext } from "../resolve/context.js";
import { processIngredientLine } from "../resolve/process-line.js";

import { describeCandidate, fixtureId, fixtureVocabulary, semanticContext } from "./helpers/resolver.js";

function best(input: string, context = semanticContext()) {
  const [mention] = processIngredientLine(input, context).mentions;
  return { mention, candidate: describeCandidate(mention?.resolution.candidates[0], context) };
}

describe("resolver metamorphic properties", () => {
  const context = semanticContext();

  it("does not change the concept when the case changes", () => {
    for (const input of ["1 lb chicken thighs", "1 LB CHICKEN THIGHS", "1 lb Chicken Thighs"]) {
      expect(best(input, context).candidate?.concept).toBe("chicken-thigh");
    }
  });

  it("resolves a plural entry to the same concept as its singular", () => {
    expect(best("1 chicken thigh", context).candidate?.concept).toBe(best("2 chicken thighs", context).candidate?.concept);
    expect(best("2 chicken thighs", context).candidate?.entryKind).toBe("PLURAL");
  });

  it("keeps the head concept when a known preparation is added", () => {
    expect(best("1 cup parsley", context).candidate?.concept).toBe("parsley");
    const prepared = best("1 cup chopped parsley", context);
    expect(prepared.candidate?.concept).toBe("parsley");
    expect(prepared.candidate?.preparations).toEqual([{ operation: "chop", position: "PRE_HEAD" }]);
  });

  it("adds an attribute for 'boneless' without creating a concept", () => {
    const plain = best("1 lb chicken thighs", context);
    const boneless = best("1 lb boneless chicken thighs", context);
    expect(boneless.candidate?.concept).toBe(plain.candidate?.concept);
    expect(boneless.candidate?.attributes).toEqual(["bone:boneless"]);
    expect(boneless.mention?.status).toBe("AUTO_RESOLVED");
  });

  it("leaves an unknown food UNRESOLVED with the whole phrase unresolved, even with an empty lexicon", () => {
    const empty = buildResolverContext({
      revision: 0,
      entries: [],
      vocabulary: fixtureVocabulary,
      concepts: [],
      relationships: [],
      applicability: [],
      conceptAttributes: [],
    });
    const { mention } = best("3 tablespoons calamansi juice", empty);
    expect(mention?.status).toBe("UNRESOLVED");
    expect(mention?.resolution.unresolved.map((span) => span.text)).toEqual(["calamansi juice"]);
  });

  it("uses the 'whole milk' concept when that entry exists, and milk plus fat_content=whole when it does not", () => {
    expect(best("1 cup whole milk", context).candidate).toMatchObject({ concept: "whole-milk", attributes: [] });

    const withoutWholeMilk = semanticContext((fixture) => ({
      ...fixture,
      entries: fixture.entries.filter((entry) => entry.text !== "whole milk"),
    }));
    const result = best("1 cup whole milk", withoutWholeMilk);
    expect(result.candidate).toMatchObject({ concept: "milk", attributes: ["fat_content:whole"] });
    expect(result.mention?.status).toBe("AUTO_RESOLVED");
  });

  it("marks attributes that do not apply to the head and holds the mention for review", () => {
    const { mention, candidate } = best("1 cup boneless milk", context);
    expect(candidate?.attributes).toEqual(["bone:boneless"]);
    expect(mention?.resolution.candidates[0]?.reasons).toContain("attribute_not_applicable:boneless");
    expect(mention?.status).toBe("NEEDS_REVIEW");
  });

  it("holds lines with unknown words in the main phrase for review and records them", () => {
    const { mention, candidate } = best("1 cup organic parsley", context);
    expect(candidate?.concept).toBe("parsley");
    expect(mention?.status).toBe("NEEDS_REVIEW");
    expect(mention?.resolution.unresolved.map((span) => span.text)).toEqual(["organic"]);
  });

  it("keeps trailing notes without blocking automatic resolution", () => {
    const { mention } = best("1 cup parsley, plus extra for serving", context);
    expect(mention?.status).toBe("AUTO_RESOLVED");
    expect(mention?.resolution.unresolved.map((span) => span.text)).toEqual(["plus extra", "serving"]);
  });

  it("records ids that exist in the snapshot", () => {
    const { mention } = best("1 lb boneless chicken thighs", context);
    const candidate = mention?.resolution.candidates[0];
    expect(candidate?.conceptId).toBe(fixtureId("concept:chicken-thigh"));
    expect(candidate?.attributes[0]?.attributeValueId).toBe(fixtureId("value:bone:boneless"));
  });
});

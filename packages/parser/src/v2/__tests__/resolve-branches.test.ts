import { describe, expect, it } from "vitest";

import { buildResolverContext } from "../resolve/context.js";
import { processIngredientLine } from "../resolve/process-line.js";

import {
  conceptId,
  describeCandidate,
  fixtureId,
  loadSemanticFixture,
  semanticContext,
  snapshotFromFixture,
} from "./helpers/resolver.js";

/** The semantic fixture plus entries and ontology rows for resolver paths the golden set does not reach. */
const context = semanticContext((fixture) => ({
  ...fixture,
  entries: [
    ...fixture.entries,
    {
      id: fixtureId("entry:pepper-black"),
      text: "pepper",
      role: "FOOD",
      concept: "black-pepper",
    },
    {
      id: fixtureId("entry:pepper-bell"),
      text: "pepper",
      role: "FOOD",
      concept: "bell-pepper",
    },
    {
      id: fixtureId("entry:canned-tomatoes"),
      text: "canned tomatoes",
      role: "FOOD",
      concept: "canned-tomatoes",
    },
    {
      id: fixtureId("entry:loosely"),
      text: "loosely",
      role: "DEGREE",
      valueKey: "loose",
    },
    {
      id: fixtureId("entry:packed"),
      text: "packed",
      role: "MEASUREMENT_MODIFIER",
      valueKey: "packed",
    },
    {
      id: fixtureId("entry:heaping"),
      text: "heaping",
      role: "MEASUREMENT_MODIFIER",
      valueKey: "heaping",
    },
    {
      id: fixtureId("entry:divided"),
      text: "divided",
      role: "INSTRUCTION",
      valueKey: "divided",
    },
    {
      id: fixtureId("entry:cut-chop"),
      text: "cut",
      role: "PREPARATION",
      preparation: "chop",
    },
    {
      id: fixtureId("entry:cut-dice"),
      text: "cut",
      role: "PREPARATION",
      preparation: "dice",
    },
  ],
  ontology: {
    ...fixture.ontology,
    concepts: [...fixture.ontology.concepts, "black-pepper", "bell-pepper"],
    applicability: [...fixture.ontology.applicability, ["color", "tomato"]],
  },
}));

function resolve(line: string) {
  const [mention] = processIngredientLine(line, context).mentions;
  if (!mention) throw new Error(`no mention for "${line}"`);
  const top = mention.resolution.candidates[0];
  return {
    mention,
    top,
    reasons: top?.reasons ?? [],
    described: describeCandidate(top, context),
  };
}

describe("resolveSegment branches", () => {
  it("keeps every food when the head text names more than one concept", () => {
    const { mention } = resolve("1 pepper");

    expect(mention.status).toBe("NEEDS_REVIEW");
    expect(
      mention.resolution.candidates
        .map((candidate) => describeCandidate(candidate, context)?.concept)
        .sort()
    ).toEqual(["bell-pepper", "black-pepper"]);
    expect(mention.resolution.candidates[0]?.reasons).toContain(
      "ambiguous_food:pepper"
    );
  });

  it("flags an extra food before the head", () => {
    const { mention, reasons, described } = resolve("1 cup milk parsley");

    expect(described?.concept).toBe("parsley");
    expect(reasons).toContain("extra_food:milk");
    expect(mention.status).toBe("NEEDS_REVIEW");
  });

  it("treats a degree with nothing to modify as unexplained", () => {
    const { mention, reasons } = resolve("1 cup finely parsley");

    expect(reasons).toContain("dangling_degree:finely");
    expect(mention.status).toBe("NEEDS_REVIEW");
  });

  it("binds a degree to a measurement modifier", () => {
    const { mention, reasons, described } = resolve(
      "1 cup loosely packed parsley"
    );

    expect(described?.modifiers).toEqual(["MEASUREMENT_MODIFIER:packed"]);
    expect(mention.resolution.candidates[0]?.modifiers[0]?.span.text).toBe(
      "loosely packed"
    );
    expect(reasons).toContain("degree:loosely->packed");
    expect(mention.status).toBe("AUTO_RESOLVED");
  });

  it("reads measurement modifiers and instructions outside the main phrase", () => {
    expect(
      resolve("1 heaping cup powdered sugar").described?.modifiers
    ).toEqual(["MEASUREMENT_MODIFIER:heaping"]);
    expect(resolve("1 cup parsley, divided").described?.modifiers).toEqual([
      "INSTRUCTION:divided",
    ]);
  });

  it("blocks auto-resolution on an ambiguous preparation or attribute", () => {
    const preparation = resolve("1 cup cut parsley");
    expect(preparation.reasons).toContain("ambiguous_preparation:cut");
    expect(preparation.mention.status).toBe("NEEDS_REVIEW");

    const attribute = resolve("2 green tomatoes");
    expect(attribute.reasons).toContain("ambiguous_attribute:green");
    expect(attribute.described?.attributes).toEqual([
      "color:green",
      "ripeness:unripe",
    ]);
    expect(attribute.mention.status).toBe("NEEDS_REVIEW");
  });

  it("applies the package rule through approximate and range quantities, but not to a canned head", () => {
    expect(resolve("about 2 cans tomatoes").described?.concept).toBe(
      "canned-tomatoes"
    );
    expect(resolve("2-3 cans tomatoes").described?.concept).toBe(
      "canned-tomatoes"
    );

    const canned = resolve("1 can canned tomatoes");
    expect(canned.described?.concept).toBe("canned-tomatoes");
    expect(canned.reasons.some((reason) => reason.startsWith("package:"))).toBe(
      false
    );
  });

  it("keeps degrees and foods outside the main phrase as notes", () => {
    const degree = resolve("1 cup parsley (finely)");
    expect(degree.reasons).toContain("dangling_degree:finely");
    expect(degree.mention.status).toBe("AUTO_RESOLVED");

    const food = resolve("1 cup milk (or parsley)");
    expect(food.described?.concept).toBe("milk");
    expect(food.top?.unresolved.map((span) => span.text)).toContain("parsley");
  });

  it("ranks exploratory segmentations by their worst mention", () => {
    const result = processIngredientLine("1 cup milk and 2 apples", context, {
      mode: "EXPLORATORY",
    });

    expect(result.mentions.map((mention) => mention.status)).toEqual([
      "AUTO_RESOLVED",
      "AUTO_RESOLVED",
    ]);
  });

  it("raises the score when verified mentions chose the concept", () => {
    const snapshot = snapshotFromFixture(loadSemanticFixture());
    const withPrior = buildResolverContext({
      ...snapshot,
      priorVerifiedShare: { milk: { [conceptId("milk")]: 1 } },
    });

    const [plain] = processIngredientLine(
      "1 cup milk",
      buildResolverContext(snapshot)
    ).mentions;
    const [prior] = processIngredientLine("1 cup milk", withPrior).mentions;

    expect(prior?.resolution.candidates[0]?.reasons).toContain("prior:1.00");
    expect(prior?.resolution.candidates[0]?.score).toBeGreaterThan(
      plain?.resolution.candidates[0]?.score ?? 1
    );
  });
});

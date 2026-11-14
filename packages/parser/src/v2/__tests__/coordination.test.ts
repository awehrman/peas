import { describe, expect, it } from "vitest";

import { processIngredientLine } from "../resolve/process-line.js";

import {
  describeCandidate,
  fixtureId,
  semanticContext,
} from "./helpers/resolver.js";

const withExtraFoods = () =>
  semanticContext((fixture) => ({
    ...fixture,
    entries: [
      ...fixture.entries,
      {
        id: fixtureId("entry:pepper"),
        text: "pepper",
        role: "FOOD",
        kind: "CANONICAL",
        concept: "pepper",
      },
      {
        id: fixtureId("entry:mac"),
        text: "macaroni and cheese",
        role: "FOOD",
        kind: "CANONICAL",
        concept: "macaroni-and-cheese",
      },
      {
        id: fixtureId("entry:cream"),
        text: "cream",
        role: "FOOD",
        kind: "CANONICAL",
        concept: "cream",
      },
      {
        id: fixtureId("entry:butter"),
        text: "butter",
        role: "FOOD",
        kind: "CANONICAL",
        concept: "butter",
      },
      {
        id: fixtureId("entry:olive-oil"),
        text: "olive oil",
        role: "FOOD",
        kind: "CANONICAL",
        concept: "olive-oil",
      },
    ],
    ontology: {
      ...fixture.ontology,
      concepts: [
        ...fixture.ontology.concepts,
        "pepper",
        "macaroni-and-cheese",
        "cream",
        "butter",
        "olive-oil",
      ],
    },
  }));

describe("coordination", () => {
  const context = withExtraFoods();

  it('splits "salt and pepper" into two mentions sharing the quantity', () => {
    const { mentions } = processIngredientLine(
      "salt and pepper, to taste",
      context
    );
    expect(
      mentions.map((mention) => [
        mention.partIndex,
        describeCandidate(mention.resolution.candidates[0], context)?.concept,
      ])
    ).toEqual([
      [0, "salt"],
      [1, "pepper"],
    ]);
    expect(mentions.map((mention) => mention.span.text)).toEqual([
      "salt",
      "pepper, to taste",
    ]);
    for (const mention of mentions)
      expect(mention.resolution.candidates[0]?.reasons).toContain(
        "split_coordination"
      );
  });

  it('keeps "macaroni and cheese" as one mention when the whole phrase is a FOOD entry', () => {
    const { mentions } = processIngredientLine(
      "2 cups macaroni and cheese",
      context
    );
    expect(mentions).toHaveLength(1);
    expect(
      describeCandidate(mentions[0]?.resolution.candidates[0], context)?.concept
    ).toBe("macaroni-and-cheese");
  });

  it('gives "1 tbsp butter and 2 tbsp olive oil" two segments with their own quantities', () => {
    const { line, mentions } = processIngredientLine(
      "1 tbsp butter and 2 tbsp olive oil",
      context
    );
    expect(line.segments).toHaveLength(2);
    expect(
      mentions.map((mention) => [
        mention.segmentIndex,
        describeCandidate(mention.resolution.candidates[0], context)?.concept,
      ])
    ).toEqual([
      [0, "butter"],
      [1, "olive-oil"],
    ]);
    expect(
      mentions.every((mention) => mention.status === "AUTO_RESOLVED")
    ).toBe(true);
  });

  it('treats "milk or cream" as alternatives for review rather than two ingredients', () => {
    const { mentions } = processIngredientLine("1 cup milk or cream", context);
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.status).toBe("NEEDS_REVIEW");
    expect(
      mentions[0]?.resolution.candidates.map(
        (candidate) => describeCandidate(candidate, context)?.concept
      )
    ).toEqual(["milk", "cream"]);
    expect(mentions[0]?.resolution.candidates[0]?.reasons).toContain(
      "alternative:or"
    );
  });
});

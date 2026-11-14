import { describe, expect, it } from "vitest";

import { describeSyntax } from "../debug/describe.js";
import { processIngredientLine } from "../resolve/process-line.js";

import {
  describeCandidate,
  fixtureId,
  semanticContext,
} from "./helpers/resolver.js";

describe("exploratory resolution", () => {
  const context = semanticContext((fixture) => ({
    ...fixture,
    entries: [
      ...fixture.entries,
      {
        id: fixtureId("entry:skim-milk"),
        text: "skim milk",
        role: "FOOD",
        kind: "CANONICAL",
        concept: "skim-milk",
        status: "PROPOSED",
      },
    ],
    ontology: {
      ...fixture.ontology,
      concepts: [...fixture.ontology.concepts, "skim-milk"],
    },
  }));

  it("ranks overlapping readings deterministically and caps them", () => {
    const first = processIngredientLine("1 cup whole milk", context, {
      mode: "EXPLORATORY",
    });
    const second = processIngredientLine("1 cup whole milk", context, {
      mode: "EXPLORATORY",
    });
    const readings = [first, ...first.alternatives].map((result) =>
      describeSyntax(result.line)
    );
    expect(readings).toEqual(
      [second, ...second.alternatives].map((result) =>
        describeSyntax(result.line)
      )
    );
    expect(readings[0]).toBe("[1 cup] {whole milk:FOOD}");
    expect(readings).toContain("[1 cup] {whole:ATTRIBUTE} {milk:FOOD}");

    const capped = processIngredientLine("1 cup whole milk", context, {
      mode: "EXPLORATORY",
      segmentationLimit: 1,
    });
    expect(capped.alternatives).toEqual([]);
  });

  it("only uses PROPOSED entries when exploring", () => {
    const conservative = processIngredientLine("1 cup skim milk", context);
    expect(
      describeCandidate(
        conservative.mentions[0]?.resolution.candidates[0],
        context
      )?.concept
    ).toBe("milk");
    expect(conservative.mentions[0]?.status).toBe("NEEDS_REVIEW");

    const exploratory = processIngredientLine("1 cup skim milk", context, {
      mode: "EXPLORATORY",
    });
    expect(
      describeCandidate(
        exploratory.mentions[0]?.resolution.candidates[0],
        context
      )?.concept
    ).toBe("skim-milk");
    expect(exploratory.mentions[0]?.status).toBe("AUTO_RESOLVED");
  });
});

describe("adding knowledge needs no grammar change", () => {
  it("resolves a new verified alias as soon as the entry exists", () => {
    const before = semanticContext();
    expect(
      processIngredientLine("2 tbsp icing sugar", before).mentions[0]?.status
    ).not.toBe("AUTO_RESOLVED");

    const after = semanticContext((fixture) => ({
      ...fixture,
      revision: fixture.revision + 1,
      entries: [
        ...fixture.entries,
        {
          id: fixtureId("entry:icing-sugar"),
          text: "icing sugar",
          role: "FOOD",
          kind: "ALIAS",
          concept: "powdered-sugar",
        },
      ],
    }));
    const [mention] = processIngredientLine(
      "2 tbsp icing sugar",
      after
    ).mentions;
    expect(mention?.status).toBe("AUTO_RESOLVED");
    expect(
      describeCandidate(mention?.resolution.candidates[0], after)
    ).toMatchObject({ concept: "powdered-sugar", entryKind: "ALIAS" });
  });
});

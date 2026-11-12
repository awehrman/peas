import { describe, expect, it } from "vitest";

import { discover, suggestRelationships } from "../knowledge/discover.js";
import { processIngredientLine } from "../resolve/process-line.js";

import {
  conceptId,
  fixtureId,
  loadSemanticFixture,
  semanticContext,
} from "./helpers/resolver.js";

const context = semanticContext((fixture) => ({
  ...fixture,
  entries: [
    ...fixture.entries,
    {
      id: fixtureId("entry:juice"),
      text: "juice",
      role: "FOOD",
      concept: "juice",
      status: "PROPOSED",
    },
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
      id: fixtureId("entry:paprika"),
      text: "paprika",
      role: "FOOD",
      concept: "paprika",
    },
    {
      id: fixtureId("entry:smoked-paprika"),
      text: "smoked paprika",
      role: "FOOD",
      concept: "smoked-paprika",
    },
  ],
  ontology: {
    ...fixture.ontology,
    concepts: [
      ...fixture.ontology.concepts,
      "juice",
      "black-pepper",
      "bell-pepper",
      "paprika",
      "smoked-paprika",
    ],
    applicability: [...fixture.ontology.applicability, ["color", "tomato"]],
  },
}));

function discoveriesFor(line: string) {
  return discover(processIngredientLine(line, context), context);
}

function summary(line: string) {
  return discoveriesFor(line).map(
    (discovery) => `${discovery.payload.type}|${discovery.key}`
  );
}

describe("discover", () => {
  it("reports an unknown food phrase with words that name proposed concepts as hints", () => {
    const [discovery] = discoveriesFor("3 tablespoons calamansi juice");

    expect(discovery).toMatchObject({
      key: "calamansi juice",
      segmentIndex: 0,
      span: { start: 14, end: 29, text: "calamansi juice" },
      payload: {
        type: "UNKNOWN_FOOD_PHRASE",
        phrase: "calamansi juice",
        headToken: "juice",
        suggestedHeadConceptIds: [conceptId("juice")],
      },
    });
  });

  it("reports unknown words next to known lexemes, with roles suggested by position and spelling", () => {
    expect(discoveriesFor("2 cups organic milk")).toEqual([
      expect.objectContaining({
        key: "organic",
        payload: {
          type: "UNKNOWN_MODIFIER",
          token: "organic",
          position: "PRE_HEAD",
          neighbors: ["milk"],
          suggestedRoles: ["ATTRIBUTE"],
        },
      }),
    ]);
    expect(
      discoveriesFor("1 cup loosely chopped parsley")[0]?.payload
    ).toMatchObject({ token: "loosely", suggestedRoles: ["DEGREE"] });
    expect(
      discoveriesFor("1 cup parsley, roughly chopped")[0]?.payload
    ).toMatchObject({
      token: "roughly",
      position: "POST_HEAD",
      suggestedRoles: ["DEGREE"],
    });
    expect(
      discoveriesFor("2 lb spatchcocked chicken")[0]?.payload
    ).toMatchObject({ suggestedRoles: ["PREPARATION", "ATTRIBUTE"] });
  });

  it("ignores unknown trailing words that touch nothing known", () => {
    expect(summary("1 cup whole milk, plus extra for serving")).toEqual([]);
  });

  it("asks how to read an attribute with several applicable meanings", () => {
    const interpretation = discoveriesFor("2 green tomatoes").find(
      (discovery) => discovery.payload.type === "ATTRIBUTE_INTERPRETATION"
    );

    expect(interpretation).toMatchObject({
      key: `green|${conceptId("tomato")}`,
      payload: { phrase: "green", headConceptId: conceptId("tomato") },
    });
    expect(
      interpretation?.payload.type === "ATTRIBUTE_INTERPRETATION" &&
        interpretation.payload.entryIds
    ).toHaveLength(2);
  });

  it("asks whether an attribute plus food names its own concept, unless the phrase is already an entry", () => {
    expect(discoveriesFor("2 green apples")).toEqual([
      expect.objectContaining({
        key: "green apples",
        payload: expect.objectContaining({
          type: "IDENTITY_DECISION",
          headConceptId: conceptId("apple"),
          cooccurrence: 0,
        }),
      }),
    ]);
    expect(summary("1 lb boneless chicken thighs")).toEqual([
      "IDENTITY_DECISION|boneless chicken thighs",
    ]);
    expect(summary("1 cup whole milk")).toEqual([]);
    expect(summary("1 tsp smoked paprika")).toEqual([]);
  });

  it("reports a head phrase that names several concepts", () => {
    expect(discoveriesFor("1 pepper")).toEqual([
      expect.objectContaining({
        key: "pepper",
        payload: {
          type: "AMBIGUOUS_MATCH",
          phrase: "pepper",
          entryIds: [
            fixtureId("entry:pepper-black"),
            fixtureId("entry:pepper-bell"),
          ],
        },
      }),
    ]);
  });

  it("finds nothing for fully explained lines and is deterministic", () => {
    expect(summary("1 cup finely chopped parsley")).toEqual([]);
    const result = processIngredientLine("2 cups organic milk", context);
    expect(discover(result, context)).toEqual(discover(result, context));
  });

  it("attributes discoveries to each coordination part's segment", () => {
    expect(
      discoveriesFor("Salt and organic parsley").map((discovery) => [
        discovery.key,
        discovery.segmentIndex,
      ])
    ).toEqual([["organic", 0]]);
  });
});

describe("suggestRelationships", () => {
  it("suggests IS_A when a concept's name ends with another concept's name, unless they are related", () => {
    const fixture = loadSemanticFixture();
    const concepts = [
      ...fixture.ontology.concepts,
      "paprika",
      "smoked-paprika",
    ].map((key) => ({
      id: conceptId(key),
      canonicalName: key.replace(/-/g, " "),
    }));
    const relationships = fixture.ontology.relationships.map(
      ([source, , target]) => ({
        sourceId: conceptId(source),
        targetId: conceptId(target),
      })
    );

    const suggestions = suggestRelationships(context, concepts, relationships);

    expect(suggestions).toEqual([
      {
        key: `name-suffix:${conceptId("smoked-paprika")}->${conceptId("paprika")}`,
        payload: {
          type: "RELATIONSHIP_SUGGESTION",
          sourceConceptId: conceptId("smoked-paprika"),
          targetConceptId: conceptId("paprika"),
          relationshipType: "IS_A",
          evidence: '"smoked paprika" ends with "paprika"',
        },
      },
    ]);
  });
});

describe("discover edge cases", () => {
  it("records known words before an unknown food as neighbors", () => {
    expect(discoveriesFor("1 cup chopped calamansi")[0]?.payload).toMatchObject(
      {
        type: "UNKNOWN_FOOD_PHRASE",
        phrase: "calamansi",
        neighbors: ["chopped"],
      }
    );
  });

  it("suggests roles for words after the head and inside parentheses", () => {
    expect(
      discoveriesFor("1 lb chicken thighs skinned")[0]?.payload
    ).toMatchObject({
      token: "skinned",
      position: "POST_HEAD",
      suggestedRoles: ["PREPARATION"],
    });
    expect(discoveriesFor("2 cups milk organic")[0]?.payload).toMatchObject({
      token: "organic",
      suggestedRoles: ["PREPARATION", "INSTRUCTION"],
    });
    expect(
      discoveriesFor("1 cup parsley (finely organic)")[0]?.payload
    ).toMatchObject({
      token: "organic",
      suggestedRoles: ["INSTRUCTION", "ATTRIBUTE"],
    });
  });

  it("handles lines without a phrase, such as a bare quantity", () => {
    expect(summary("2 cups")).toEqual([]);
    expect(summary("1 (14 oz) can")).toEqual([]);
  });

  it("finds no food phrase when the line ends in a known modifier, and no ambiguity for alternatives that name one food each", () => {
    expect(summary("1 cup finely")).toEqual([]);
    expect(summary("1 cup milk or salt")).toEqual([]);
  });
});

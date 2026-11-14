import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  discoveryPriority,
  priorityForDiscovery,
} from "../knowledge/priority.js";
import {
  DecisionPayloadSchema,
  DiscoveryPayloadSchema,
} from "../knowledge/schemas.js";
import { entryMatchKey } from "../lexicon/token-trie.js";
import {
  effectiveClassifications,
  inheritableKinds,
} from "../ontology/inheritance.js";
import { ResolutionSchema } from "../resolve/schemas.js";

const ids = {
  milk: randomUUID(),
  chicken: randomUUID(),
  poultry: randomUUID(),
  grape: randomUUID(),
  apple: randomUUID(),
  fruit: randomUUID(),
};

describe("inheritableKinds", () => {
  it("follows the rule for a single edge", () => {
    expect(inheritableKinds(["IS_A"])).toEqual([
      "FOOD_GROUP",
      "DIETARY",
      "ALLERGEN",
      "CATEGORY",
    ]);
    expect(inheritableKinds(["PART_OF"])).toEqual(["FOOD_GROUP", "ALLERGEN"]);
    expect(inheritableKinds(["DERIVED_FROM"])).toEqual([
      "FOOD_GROUP",
      "ALLERGEN",
    ]);
    expect(inheritableKinds(["PROCESSED_FROM"])).toEqual([
      "FOOD_GROUP",
      "ALLERGEN",
    ]);
  });

  it("intersects the rules along a path and never inherits certifications", () => {
    expect(inheritableKinds(["PART_OF", "IS_A"])).toEqual([
      "FOOD_GROUP",
      "ALLERGEN",
    ]);
    expect(inheritableKinds(["PROCESSED_FROM", "IS_A"])).toEqual([
      "FOOD_GROUP",
      "ALLERGEN",
    ]);
    expect(inheritableKinds([])).toEqual([]);
    expect(inheritableKinds(["IS_A"])).not.toContain("CERTIFICATION");
  });
});

describe("effectiveClassifications", () => {
  it("inherits food groups and allergens, not categories, across DERIVED_FROM (buttermilk from milk)", () => {
    const result = effectiveClassifications(
      [],
      [
        {
          conceptId: ids.milk,
          path: ["DERIVED_FROM"],
          classifications: [
            { kind: "FOOD_GROUP", key: "DAIRY", value: "TRUE" },
            { kind: "ALLERGEN", key: "ALLERGEN_MILK", value: "TRUE" },
            { kind: "CATEGORY", key: "CATEGORY:Milk", value: "TRUE" },
          ],
        },
      ]
    );
    expect(result).toEqual([
      {
        kind: "ALLERGEN",
        key: "ALLERGEN_MILK",
        value: "TRUE",
        source: "INHERITED",
        inheritedFromConceptId: ids.milk,
        path: ["DERIVED_FROM"],
      },
      {
        kind: "FOOD_GROUP",
        key: "DAIRY",
        value: "TRUE",
        source: "INHERITED",
        inheritedFromConceptId: ids.milk,
        path: ["DERIVED_FROM"],
      },
    ]);
  });

  it("lets explicit values win and prefers the nearest ancestor", () => {
    const result = effectiveClassifications(
      [{ kind: "CATEGORY", key: "CATEGORY:Poultry", value: "TRUE" }],
      [
        {
          conceptId: ids.chicken,
          path: ["PART_OF"],
          classifications: [
            { kind: "FOOD_GROUP", key: "POULTRY", value: "TRUE" },
          ],
        },
        {
          conceptId: ids.poultry,
          path: ["PART_OF", "IS_A"],
          classifications: [
            { kind: "FOOD_GROUP", key: "POULTRY", value: "FALSE" },
            { kind: "CATEGORY", key: "CATEGORY:Poultry", value: "FALSE" },
          ],
        },
      ]
    );
    expect(
      result.map(({ key, value, source }) => ({ key, value, source }))
    ).toEqual([
      { key: "CATEGORY:Poultry", value: "TRUE", source: "EXPLICIT" },
      { key: "POULTRY", value: "TRUE", source: "INHERITED" },
    ]);
  });

  it("marks disagreeing ancestors at the same distance as a conflict", () => {
    const [result] = effectiveClassifications(
      [],
      [
        {
          conceptId: ids.apple,
          path: ["IS_A"],
          classifications: [{ kind: "DIETARY", key: "VEGAN", value: "TRUE" }],
        },
        {
          conceptId: ids.fruit,
          path: ["IS_A"],
          classifications: [{ kind: "DIETARY", key: "VEGAN", value: "FALSE" }],
        },
      ]
    );
    expect(result).toMatchObject({
      key: "VEGAN",
      value: "UNKNOWN",
      source: "CONFLICT",
    });
  });

  it("prefers a definite value over UNKNOWN at the same distance", () => {
    const [result] = effectiveClassifications(
      [],
      [
        {
          conceptId: ids.grape,
          path: ["IS_A"],
          classifications: [
            { kind: "DIETARY", key: "VEGAN", value: "UNKNOWN" },
          ],
        },
        {
          conceptId: ids.fruit,
          path: ["IS_A"],
          classifications: [{ kind: "DIETARY", key: "VEGAN", value: "TRUE" }],
        },
      ]
    );
    expect(result).toMatchObject({
      value: "TRUE",
      source: "INHERITED",
      inheritedFromConceptId: ids.fruit,
    });
  });
});

describe("knowledge payload schemas", () => {
  it("accepts one valid payload per discovery type", () => {
    const payloads = [
      {
        type: "UNKNOWN_FOOD_PHRASE",
        phrase: "calamansi juice",
        headToken: "juice",
      },
      {
        type: "UNKNOWN_MODIFIER",
        token: "spatchcocked",
        position: "PRE_HEAD",
        neighbors: ["chicken"],
      },
      {
        type: "ATTRIBUTE_INTERPRETATION",
        phrase: "green",
        entryIds: [randomUUID()],
        headConceptId: null,
      },
      {
        type: "IDENTITY_DECISION",
        phrase: "smoked paprika",
        modifierEntryIds: [randomUUID()],
        headConceptId: randomUUID(),
        cooccurrence: 14,
      },
      {
        type: "AMBIGUOUS_MATCH",
        phrase: "cream",
        entryIds: [randomUUID(), randomUUID()],
      },
      {
        type: "RELATIONSHIP_SUGGESTION",
        sourceConceptId: randomUUID(),
        targetConceptId: randomUUID(),
        relationshipType: "IS_A",
        evidence: "shares head token 'onion'",
      },
      {
        type: "STRUCTURAL_PATTERN",
        signature: "QTY UNIT PAREN(QTY UNIT) PHRASE",
        example: "1 cup (2 sticks) butter",
      },
      {
        type: "VERIFIED_DRIFT",
        mentionId: randomUUID(),
        verifiedConceptId: randomUUID(),
        proposedConceptId: null,
        parserVersion: "2.0.0",
        lexiconRevision: 4,
      },
    ];
    for (const payload of payloads)
      expect(DiscoveryPayloadSchema.parse(payload)).toEqual(payload);
  });

  it("rejects an ambiguous match with fewer than two entries", () => {
    expect(
      DiscoveryPayloadSchema.safeParse({
        type: "AMBIGUOUS_MATCH",
        phrase: "cream",
        entryIds: [randomUUID()],
      }).success
    ).toBe(false);
  });

  it("requires a CLASSIFY_MODIFIER target that matches its role", () => {
    expect(
      DecisionPayloadSchema.safeParse({
        type: "CLASSIFY_MODIFIER",
        token: "roughly",
        role: "DEGREE",
        valueKey: "rough",
      }).success
    ).toBe(true);
    expect(
      DecisionPayloadSchema.safeParse({
        type: "CLASSIFY_MODIFIER",
        token: "roughly",
        role: "ATTRIBUTE",
        valueKey: "rough",
      }).success
    ).toBe(false);
  });

  it("requires an EDIT_ENTRY target that matches its role", () => {
    const base = {
      type: "EDIT_ENTRY",
      entryId: randomUUID(),
      text: "green",
      status: "ACTIVE",
    };
    const accepted = (payload: Record<string, unknown>) =>
      DecisionPayloadSchema.safeParse({ ...base, ...payload }).success;
    expect(accepted({ role: "FOOD", conceptId: randomUUID() })).toBe(true);
    expect(
      accepted({ role: "ATTRIBUTE", attributeValueId: randomUUID() })
    ).toBe(true);
    expect(accepted({ role: "PREPARATION", preparationId: randomUUID() })).toBe(
      true
    );
    expect(accepted({ role: "INSTRUCTION", valueKey: "divided" })).toBe(true);
    for (const role of ["FOOD", "ATTRIBUTE", "PREPARATION", "DEGREE"])
      expect(accepted({ role })).toBe(false);
    expect(
      accepted({ role: "FOOD", conceptId: randomUUID(), status: "GONE" })
    ).toBe(false);
  });

  it("rejects self-relationships and self-merges", () => {
    const id = randomUUID();
    expect(
      DecisionPayloadSchema.safeParse({
        type: "ADD_RELATIONSHIP",
        sourceConceptId: id,
        targetConceptId: id,
        relationshipType: "IS_A",
      }).success
    ).toBe(false);
    expect(
      DecisionPayloadSchema.safeParse({
        type: "MERGE_CONCEPTS",
        survivorId: id,
        mergedId: id,
      }).success
    ).toBe(false);
  });

  it("accepts an empty resolution for an unknown food", () => {
    const resolution = {
      resolverVersion: "1.0.0",
      candidates: [],
      unresolved: [{ start: 14, end: 29, text: "calamansi juice" }],
    };
    expect(ResolutionSchema.parse(resolution)).toEqual(resolution);
  });
});

describe("discovery priority", () => {
  it("matches the documented formula", () => {
    expect(
      discoveryPriority({
        distinctNotes: 7,
        mentions: 9,
        isAmbiguous: false,
        isUnresolved: true,
      })
    ).toBeCloseTo(6 + Math.log2(10) + 2);
    expect(
      priorityForDiscovery("AMBIGUOUS_MATCH", { distinctNotes: 1, mentions: 1 })
    ).toBe(4);
  });

  it("ranks spread across notes above repetition within one note", () => {
    const spread = priorityForDiscovery("STRUCTURAL_PATTERN", {
      distinctNotes: 8,
      mentions: 8,
    });
    const repeated = priorityForDiscovery("STRUCTURAL_PATTERN", {
      distinctNotes: 1,
      mentions: 8,
    });
    expect(spread).toBeGreaterThan(repeated);
  });
});

describe("entryMatchKey", () => {
  it("is case- and spacing-insensitive but keeps punctuation tokens", () => {
    expect(entryMatchKey("Flat-Leaf  Parsley")).toBe("flat - leaf parsley");
    expect(entryMatchKey("kosher salt")).toBe(entryMatchKey("Kosher Salt"));
    expect(entryMatchKey("all purpose flour")).not.toBe(
      entryMatchKey("all-purpose flour")
    );
  });
});

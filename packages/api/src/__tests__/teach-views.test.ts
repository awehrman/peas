import { getCurrentRevision, loadResolverSnapshot } from "@peas/database";
import {
  type DecisionPayload,
  type DiscoveryPayload,
  type ResolverSnapshot,
  buildResolverContext,
  processIngredientLine,
} from "@peas/parser/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  currentResolverContext,
  describeDecision,
  describeDiscoveries,
  mentionView,
  syntaxTokens,
} from "../resolvers/teach-views";

const NAMES: Record<string, string> = {
  "00000000-0000-4000-8000-000000000001": "milk",
  "00000000-0000-4000-8000-000000000002": "whole milk",
  "00000000-0000-4000-8000-000000000003": "tomato",
};
const MILK = "00000000-0000-4000-8000-000000000001";
const WHOLE_MILK = "00000000-0000-4000-8000-000000000002";
const TOMATO = "00000000-0000-4000-8000-000000000003";
const ENTRY_GREEN = "00000000-0000-4000-8000-0000000000e1";
const ENTRY_MILK = "00000000-0000-4000-8000-0000000000e2";

vi.mock("@peas/database", () => ({
  getConceptRefs: vi.fn(async (ids: string[]) =>
    ids
      .filter((id) => NAMES[id])
      .map((id) => ({ id, canonicalName: NAMES[id], status: "VERIFIED" }))
  ),
  getLexiconEntryRefs: vi.fn(async (ids: string[]) =>
    ids
      .filter((id) => id === ENTRY_GREEN)
      .map((id) => ({
        id,
        text: "green",
        role: "ATTRIBUTE",
        status: "ACTIVE",
        conceptId: null,
        attributeValueId: null,
        targetLabel: "color: green",
      }))
  ),
  getCurrentRevision: vi.fn(),
  loadResolverSnapshot: vi.fn(),
}));

const snapshot: ResolverSnapshot = {
  revision: 3,
  entries: [
    { id: ENTRY_MILK, text: "milk", role: "FOOD", conceptId: MILK },
    {
      id: "00000000-0000-4000-8000-0000000000e3",
      text: "whole milk",
      role: "FOOD",
      conceptId: WHOLE_MILK,
    },
  ],
  vocabulary: { definitions: [], preparations: [] },
  concepts: [
    { id: MILK, canonicalName: "milk", status: "VERIFIED" },
    { id: WHOLE_MILK, canonicalName: "whole milk", status: "VERIFIED" },
  ],
  relationships: [],
  applicability: [],
  conceptAttributes: [],
};

function discovery(payload: DiscoveryPayload) {
  return {
    id: "d",
    type: payload.type,
    key: "k",
    status: "OPEN" as const,
    priority: 1,
    mentionCount: 1,
    distinctNoteCount: 1,
    payload,
  };
}

describe("describeDiscoveries", () => {
  it("titles every discovery type and resolves the ids its payload names", async () => {
    const described = await describeDiscoveries([
      discovery({
        type: "UNKNOWN_FOOD_PHRASE",
        phrase: "calamansi juice",
        headToken: "juice",
        suggestedHeadConceptIds: [TOMATO],
      }),
      discovery({
        type: "UNKNOWN_MODIFIER",
        token: "organic",
        position: "PRE_HEAD",
        neighbors: ["milk"],
        adjacentHeads: [{ conceptId: MILK, distinctNotes: 2 }],
      }),
      discovery({
        type: "ATTRIBUTE_INTERPRETATION",
        phrase: "green",
        entryIds: [ENTRY_GREEN, "00000000-0000-4000-8000-0000000000ff"],
        headConceptId: TOMATO,
      }),
      discovery({
        type: "ATTRIBUTE_INTERPRETATION",
        phrase: "fresh",
        entryIds: [ENTRY_GREEN],
        headConceptId: null,
      }),
      discovery({
        type: "IDENTITY_DECISION",
        phrase: "whole milk",
        modifierEntryIds: [ENTRY_GREEN],
        headConceptId: MILK,
        cooccurrence: 3,
      }),
      discovery({
        type: "AMBIGUOUS_MATCH",
        phrase: "pepper",
        entryIds: [ENTRY_GREEN, ENTRY_MILK],
      }),
      discovery({
        type: "RELATIONSHIP_SUGGESTION",
        sourceConceptId: WHOLE_MILK,
        targetConceptId: MILK,
        relationshipType: "IS_A",
        evidence: "name",
      }),
      discovery({
        type: "STRUCTURAL_PATTERN",
        signature: "QTY UNIT PAREN",
        example: "1 cup (2 sticks) butter",
      }),
      discovery({
        type: "VERIFIED_DRIFT",
        mentionId: MILK,
        verifiedConceptId: WHOLE_MILK,
        proposedConceptId: null,
        parserVersion: "2.0.0",
        lexiconRevision: 4,
      }),
    ]);

    expect(described.map((item) => item.title)).toEqual([
      "calamansi juice",
      "organic",
      "green with tomato",
      "fresh",
      "whole milk",
      "pepper",
      "whole milk IS_A milk",
      "QTY UNIT PAREN",
      "verified whole milk, now reads nothing",
    ]);
    expect(described[0]?.concepts).toEqual([
      { id: TOMATO, canonicalName: "tomato", status: "VERIFIED" },
    ]);
    expect(described[2]?.entries).toEqual([
      {
        id: ENTRY_GREEN,
        text: "green",
        role: "ATTRIBUTE",
        targetLabel: "color: green",
        conceptId: null,
        attributeValueId: null,
      },
    ]);
  });
});

describe("describeDecision", () => {
  it.each<[DecisionPayload, string]>([
    [
      {
        type: "MAP_TO_CONCEPT",
        phrase: "icing sugar",
        conceptId: MILK,
        kind: "ALIAS",
      },
      "Taught: icing sugar is milk",
    ],
    [
      {
        type: "CREATE_CONCEPT",
        canonicalName: "calamansi",
        phrase: "calamansi",
        relationships: [],
      },
      "Taught: new concept calamansi",
    ],
    [
      {
        type: "CONCEPT_PLUS_ATTRIBUTE",
        phrase: "whole milk",
        conceptId: MILK,
        attributeValueIds: [MILK],
      },
      "Taught: whole milk is milk with an attribute",
    ],
    [
      {
        type: "CLASSIFY_MODIFIER",
        token: "heaped",
        role: "MEASUREMENT_MODIFIER",
        valueKey: "heaping",
      },
      "Taught: heaped is a measurement modifier",
    ],
    [
      {
        type: "ADD_ATTRIBUTE_VALUE",
        definitionId: MILK,
        key: "teal",
        label: "Teal",
      },
      "Taught: new attribute value Teal",
    ],
    [
      {
        type: "ADD_RELATIONSHIP",
        sourceConceptId: WHOLE_MILK,
        targetConceptId: MILK,
        relationshipType: "IS_A",
      },
      "Taught: whole milk IS_A milk",
    ],
    [
      { type: "MARK_AMBIGUOUS", phrase: "pepper", entryIds: [MILK, TOMATO] },
      "Taught: pepper stays ambiguous",
    ],
    [
      { type: "IGNORE_TOKEN", token: "good-quality" },
      "Taught: ignore good-quality",
    ],
    [{ type: "REJECT", reason: "noise" }, "Rejected"],
    [
      { type: "MERGE_CONCEPTS", survivorId: MILK, mergedId: WHOLE_MILK },
      "Taught: merged whole milk into milk",
    ],
    [
      {
        type: "CORRECT_MENTION",
        mentionId: MILK,
        conceptId: null,
        attributeValueIds: [],
      },
      "Corrected to nothing",
    ],
    [{ type: "REVERT", decisionId: MILK }, "Reverted the decision"],
    [
      {
        type: "MAP_TO_CONCEPT",
        phrase: "x",
        conceptId: "00000000-0000-4000-8000-0000000000aa",
        kind: "ALIAS",
      },
      "Taught: x is a concept",
    ],
  ])("%j", async (payload, expected) => {
    expect(await describeDecision(payload)).toBe(expected);
  });
});

describe("mention views", () => {
  const context = buildResolverContext(snapshot);
  const result = processIngredientLine("2 cups organic milk (cold)", context);
  const segment = result.line.segments[0];
  const resolution = result.mentions[0]?.resolution;
  if (!segment || !resolution) throw new Error("fixture line did not parse");

  const detail = {
    id: "m",
    parsedLineId: "l",
    segmentIndex: 0,
    rawText: segment.span.text,
    conceptId: null,
    conceptName: null,
    resolutionStatus: "NEEDS_REVIEW" as const,
    score: resolution.candidates[0]?.score ?? null,
    quantity: segment.quantity ?? null,
    verifiedAt: null,
    syntax: {
      line: {
        raw: result.line.raw,
        normalized: result.line.normalized,
        status: result.line.status,
        segmentationIndex: 0,
        segmentCount: 1,
      },
      segment,
    },
    resolution,
    mode: "CONSERVATIVE" as const,
    parserVersion: "2",
    normalizerVersion: "1",
    resolverVersion: "1.0.0",
    lexiconRevision: 3,
    verifiedById: null,
    attributes: [],
    preparations: [],
    modifiers: [],
  };

  it("shows the resolver's reading, words by zone, and candidates with reasons", () => {
    const view = mentionView(detail, context);

    expect(view).toMatchObject({
      status: "NEEDS_REVIEW",
      concept: null,
      quantity: "2 cup",
      verified: false,
      summary: { status: "NEEDS_REVIEW", text: "milk" },
    });
    expect(
      view.tokens.map((token) => [token.span.text, token.kind, token.zone])
    ).toEqual([
      ["organic", "UNKNOWN", "MAIN"],
      ["milk", "LEXEME", "MAIN"],
      ["cold", "UNKNOWN", "PAREN"],
    ]);
    expect(view.candidates[0]).toMatchObject({
      conceptName: "milk",
      modifiers: [],
    });
    expect(
      syntaxTokens(segment, { start: 0, end: 15, text: "" }).map(
        (token) => token.span.text
      )
    ).toEqual(["organic"]);
  });

  it("shows a person's correction for verified mentions", () => {
    const view = mentionView(
      {
        ...detail,
        resolutionStatus: "VERIFIED",
        conceptId: WHOLE_MILK,
        conceptName: "whole milk",
        verifiedAt: "2026-11-12T00:00:00.000Z",
        attributes: [
          {
            attributeValueId: MILK,
            definitionKey: "fat_content",
            valueKey: "whole",
            label: "Whole",
            source: "MANUAL",
            spanStart: null,
            spanEnd: null,
          },
        ],
      },
      context
    );

    expect(view).toMatchObject({
      status: "VERIFIED",
      verified: true,
      concept: {
        id: WHOLE_MILK,
        canonicalName: "whole milk",
        status: "VERIFIED",
      },
      summary: {
        status: "VERIFIED",
        conceptName: "whole milk",
        attributes: ["fat_content:whole"],
        text: "whole milk (fat_content: whole)",
      },
    });
  });
});

describe("currentResolverContext", () => {
  beforeEach(() => {
    vi.mocked(loadResolverSnapshot).mockReset().mockResolvedValue(snapshot);
  });

  it("rebuilds the context only when the lexicon revision changes", async () => {
    vi.mocked(getCurrentRevision).mockResolvedValue(3);
    const first = await currentResolverContext();
    const second = await currentResolverContext();
    expect(second).toBe(first);
    expect(loadResolverSnapshot).toHaveBeenCalledTimes(1);

    vi.mocked(loadResolverSnapshot).mockResolvedValue({
      ...snapshot,
      revision: 4,
    });
    vi.mocked(getCurrentRevision).mockResolvedValue(4);
    const third = await currentResolverContext();
    expect(third.revision).toBe(4);
    expect(loadResolverSnapshot).toHaveBeenCalledTimes(2);
  });
});

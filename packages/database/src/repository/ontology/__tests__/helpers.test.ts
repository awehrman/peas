import {
  CLASSIFICATION_KINDS,
  CONCEPT_STATUSES,
  DECISION_TYPES,
  DISCOVERY_STATUSES,
  DISCOVERY_TYPES,
  ENTRY_STATUSES,
  FOOD_RELATIONSHIP_TYPES,
  LEGACY_MAPPING_STATUSES,
  LEXICON_ROLES,
  LEXICON_TERM_KINDS,
  PARSE_MODES,
  PREP_POSITIONS,
  RESOLUTION_STATUSES,
  TRI_STATES,
  VALUE_SOURCES,
} from "@peas/parser/v2";
import {
  ClassificationKind,
  ConceptStatus,
  DecisionType,
  DiscoveryStatus,
  DiscoveryType,
  EntryStatus,
  FoodRelationshipType,
  LegacyMappingStatus,
  LexiconRole,
  LexiconTermKind,
  ParseMode,
  PrepPosition,
  ResolutionStatus,
  TriState,
  ValueSource,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  OntologyError,
  computeTargetKey,
  nextFreeSlug,
  parseOrThrow,
  slugify,
  uuidv7,
} from "../helpers.js";

describe("computeTargetKey", () => {
  it("builds one key per role (decision D4)", () => {
    const id = randomUUID();
    expect(computeTargetKey({ role: "FOOD", conceptId: id })).toBe(
      `food:${id}`
    );
    expect(computeTargetKey({ role: "ATTRIBUTE", attributeValueId: id })).toBe(
      `attr:${id}`
    );
    expect(computeTargetKey({ role: "PREPARATION", preparationId: id })).toBe(
      `prep:${id}`
    );
    expect(computeTargetKey({ role: "DEGREE", valueKey: "fine" })).toBe(
      "degree:fine"
    );
    expect(
      computeTargetKey({ role: "MEASUREMENT_MODIFIER", valueKey: "packed" })
    ).toBe("measurement_modifier:packed");
    expect(computeTargetKey({ role: "INSTRUCTION", valueKey: "divided" })).toBe(
      "instruction:divided"
    );
  });

  it("rejects a role without its target", () => {
    expect(() => computeTargetKey({ role: "FOOD" })).toThrow(OntologyError);
    expect(() => computeTargetKey({ role: "DEGREE", valueKey: "" })).toThrow(
      /valueKey/
    );
  });
});

describe("slugify", () => {
  it("folds accents, spells out ampersands, and collapses punctuation", () => {
    expect(slugify("Granny Smith Apple")).toBe("granny-smith-apple");
    expect(slugify("Crème Fraîche")).toBe("creme-fraiche");
    expect(slugify("Salt & Pepper")).toBe("salt-and-pepper");
    expect(slugify("  --Jalapeño (fresh)--  ")).toBe("jalapeno-fresh");
  });

  it("never returns an empty slug", () => {
    expect(slugify("!!!")).toBe("concept");
  });

  it("adds a numeric suffix on collision", () => {
    expect(nextFreeSlug("apple", [])).toBe("apple");
    expect(nextFreeSlug("apple", ["apple", "apple-2"])).toBe("apple-3");
    expect(nextFreeSlug("apple", ["apple-2"])).toBe("apple");
  });
});

describe("uuidv7", () => {
  it("produces RFC 9562 version 7 UUIDs that sort by time", () => {
    const earlier = uuidv7(1_700_000_000_000);
    const later = uuidv7(1_700_000_000_001);
    expect(z.uuid().safeParse(earlier).success).toBe(true);
    expect(earlier[14]).toBe("7");
    expect(["8", "9", "a", "b"]).toContain(earlier[19]);
    expect(earlier < later).toBe(true);
  });
});

describe("parseOrThrow", () => {
  it("returns parsed data or names the column and path", () => {
    const schema = z.object({ count: z.number() });
    expect(parseOrThrow(schema, { count: 2 }, "Thing.json")).toEqual({
      count: 2,
    });
    expect(() => parseOrThrow(schema, { count: "2" }, "Thing.json")).toThrow(
      /Invalid Thing.json at count/
    );
  });
});

describe("Prisma enums match @peas/parser/v2", () => {
  const pairs: [string, Record<string, string>, readonly string[]][] = [
    ["ConceptStatus", ConceptStatus, CONCEPT_STATUSES],
    ["EntryStatus", EntryStatus, ENTRY_STATUSES],
    ["LexiconRole", LexiconRole, LEXICON_ROLES],
    ["LexiconTermKind", LexiconTermKind, LEXICON_TERM_KINDS],
    ["FoodRelationshipType", FoodRelationshipType, FOOD_RELATIONSHIP_TYPES],
    ["ClassificationKind", ClassificationKind, CLASSIFICATION_KINDS],
    ["TriState", TriState, TRI_STATES],
    ["ValueSource", ValueSource, VALUE_SOURCES],
    ["ResolutionStatus", ResolutionStatus, RESOLUTION_STATUSES],
    ["ParseMode", ParseMode, PARSE_MODES],
    ["PrepPosition", PrepPosition, PREP_POSITIONS],
    ["DiscoveryType", DiscoveryType, DISCOVERY_TYPES],
    ["DiscoveryStatus", DiscoveryStatus, DISCOVERY_STATUSES],
    ["DecisionType", DecisionType, DECISION_TYPES],
    ["LegacyMappingStatus", LegacyMappingStatus, LEGACY_MAPPING_STATUSES],
  ];

  it.each(pairs)("%s", (_name, prismaEnum, parserList) => {
    expect(Object.values(prismaEnum).sort()).toEqual([...parserList].sort());
  });
});

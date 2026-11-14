import { describe, expect, it } from "vitest";

import {
  ATTRIBUTE_DIMENSIONS,
  PREPARATION_OPERATIONS,
} from "../ontology/vocabulary.js";
import { buildResolutionReport, conceptSlug } from "../resolve/report.js";

import { loadFixture } from "./helpers/golden.js";
import { semanticContext } from "./helpers/resolver.js";

interface ModifierSeed {
  entries: {
    text: string;
    role: string;
    attribute?: string;
    preparation?: string;
    valueKey?: string;
  }[];
}

describe("buildResolutionReport", () => {
  const context = semanticContext();

  it("reports coverage by status and keeps unknown phrases unresolved", () => {
    const report = buildResolutionReport({
      source: "test",
      lines: ["1 cup whole milk", "2 cups mystery flour"],
      context,
    });

    expect(report).toContain("2 lines, 2 mentions");
    expect(report).toContain("| AUTO_RESOLVED | 1 | 50.0% |");
    expect(report).toContain("| UNRESOLVED | 1 | 50.0% |");
    expect(report).toContain("| mystery flour | 1 |");
  });

  it("lists entry text with more than one target", () => {
    const report = buildResolutionReport({
      source: "test",
      lines: [],
      context,
    });

    expect(report).toContain(
      "| whole | ATTRIBUTE fat_content:whole; ATTRIBUTE form:whole |"
    );
    expect(report).toContain("| 0.5 | n/a | 0 | n/a |");
  });

  it("scores semantic cases by concept slug, counting expected-unresolved cases", () => {
    const report = buildResolutionReport({
      source: "test",
      lines: [],
      context,
      semanticCases: [
        {
          id: "a",
          input: "2 Granny Smith apples",
          expectedConcept: "granny-smith-apple",
        },
        {
          id: "b",
          input: "3 tablespoons calamansi juice",
          expectedConcept: null,
        },
        { id: "c", input: "1 cup milk", expectedConcept: "whole-milk" },
      ],
      thresholds: [0.5],
    });

    expect(report).toContain("2 / 3 correct (66.7%).");
    expect(report).toContain("| 0.5 | n/a | 2 | 50.0% |");
  });

  it("collects unresolved phrases from reviewed candidates and handles empty sections", () => {
    const empty = semanticContext((fixture) => ({
      ...fixture,
      entries: fixture.entries.filter(
        (entry) => entry.text !== "whole" && entry.text !== "green"
      ),
    }));
    const report = buildResolutionReport({
      source: "test",
      lines: ["1 cup organic milk"],
      context: empty,
    });

    expect(report).toContain("| AUTO_RESOLVED | 0 | 0.0% |");
    expect(report).toContain("| organic | 1 |");
    expect(report).toContain(
      "## Ambiguous lexemes\n\nEntry text with more than one target. The resolver picks by role priority and applicability; each of these is worth a look.\n\nNone."
    );
    expect(report).toContain("No semantic cases.");

    const clean = buildResolutionReport({
      source: "test",
      lines: ["1 cup milk"],
      context: empty,
    });
    expect(clean).toContain("## Top unresolved phrases\n\nNone.");
  });

  it("slugs concept names", () => {
    expect(conceptSlug("Granny Smith apple")).toBe("granny-smith-apple");
    expect(conceptSlug("  crème fraîche! ")).toBe("crème-fraîche");
  });
});

describe("modifiers.seed.json", () => {
  const seed = loadFixture<ModifierSeed>("lexicon/modifiers.seed.json");
  const attributes = new Set(
    ATTRIBUTE_DIMENSIONS.flatMap((dimension) =>
      dimension.values.map((value) => `${dimension.key}:${value.key}`)
    )
  );
  const preparations = new Set(
    PREPARATION_OPERATIONS.map((operation) => operation.key)
  );

  it("only targets vocabulary that the ontology seed creates", () => {
    const missing = seed.entries.filter((entry) =>
      entry.role === "ATTRIBUTE"
        ? !attributes.has(entry.attribute ?? "")
        : entry.role === "PREPARATION"
          ? !preparations.has(entry.preparation ?? "")
          : !entry.valueKey
    );

    expect(missing).toEqual([]);
  });

  it("has no duplicate text and target pairs", () => {
    const keys = seed.entries.map(
      (entry) =>
        `${entry.text.toLowerCase()}|${entry.role}|${entry.attribute ?? entry.preparation ?? entry.valueKey}`
    );

    expect(new Set(keys).size).toBe(keys.length);
  });
});

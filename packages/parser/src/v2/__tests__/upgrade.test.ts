import { describe, expect, it } from "vitest";

import { parserMajor, upgradeStoredSyntax } from "../ast/upgrade.js";
import { buildResolverContext } from "../resolve/context.js";
import { processIngredientLine } from "../resolve/process-line.js";
import { MentionSyntaxSchema } from "../resolve/schemas.js";

const context = buildResolverContext({
  revision: 1,
  entries: [],
  vocabulary: { definitions: [], preparations: [] },
  concepts: [],
  relationships: [],
  applicability: [],
  conceptAttributes: [],
});

/** What a mention stored for "2 cups flour" before 2.1.0 looks like. */
function storedSyntax() {
  const result = processIngredientLine("2 cups flour", context);
  const segment = result.line.segments[0];
  return JSON.parse(
    JSON.stringify({
      line: {
        raw: result.line.raw,
        normalized: result.line.normalized,
        status: result.line.status,
        segmentationIndex: 0,
        segmentCount: 1,
      },
      segment,
    })
  ) as Record<string, unknown>;
}

describe("upgradeStoredSyntax", () => {
  it("passes syntax from the previous minor version through, and it still validates", () => {
    const stored = storedSyntax();
    const upgraded = upgradeStoredSyntax(stored, "2.0.0", {
      currentVersion: "2.1.0",
    });
    expect(upgraded).toEqual(stored);
    expect(MentionSyntaxSchema.safeParse(upgraded).success).toBe(true);
  });

  it("applies one upgrade per major version, in order", () => {
    const upgraded = upgradeStoredSyntax(storedSyntax(), "1.4.2", {
      currentVersion: "3.0.0",
      upgrades: {
        1: (stored) => ({ ...stored, upgradedFrom: [1] }),
        2: (stored) => ({
          ...stored,
          upgradedFrom: [...(stored.upgradedFrom as number[]), 2],
        }),
      },
    });
    expect(upgraded).toMatchObject({ upgradedFrom: [1, 2] });
  });

  it("refuses syntax from a newer parser or with no upgrade path", () => {
    expect(() =>
      upgradeStoredSyntax(storedSyntax(), "3.0.0", { currentVersion: "2.1.0" })
    ).toThrow("newer than this parser");
    expect(() =>
      upgradeStoredSyntax(storedSyntax(), "1.0.0", { currentVersion: "2.1.0" })
    ).toThrow("No syntax upgrade from parser major 1 to 2");
    expect(() =>
      upgradeStoredSyntax("nope", "1.0.0", {
        currentVersion: "2.0.0",
        upgrades: { 1: (stored) => stored },
      })
    ).toThrow("not an object");
  });
});

describe("parserMajor", () => {
  it("reads plain and job-style versions", () => {
    expect(parserMajor("2.1.0")).toBe(2);
    expect(parserMajor("v2:2.1.0")).toBe(2);
    expect(() => parserMajor("static_v1")).toThrow("Not a parser version");
  });
});

import { describe, expect, it } from "vitest";

import {
  type ParseSample,
  createIngredientMetrics,
} from "../../ingredient/ingredient-metrics";

function sample(overrides: Partial<ParseSample>): ParseSample {
  return {
    at: 0,
    syntaxStatus: "PARSED",
    resolutionStatuses: ["AUTO_RESOLVED"],
    candidateCount: 1,
    unknownTokens: 0,
    lexiconRevision: 7,
    ...overrides,
  };
}

describe("ingredient metrics", () => {
  it("summarizes throughput, structure, coverage, and candidates over the window", () => {
    let clock = 10_000;
    const metrics = createIngredientMetrics({ windowMs: 10_000, now: () => clock });
    metrics.record(sample({ at: 1_000 }));
    metrics.record(
      sample({
        at: 2_000,
        syntaxStatus: "PARTIAL",
        resolutionStatuses: ["NEEDS_REVIEW", "UNRESOLVED"],
        candidateCount: 3,
        unknownTokens: 2,
        lexiconRevision: 8,
      })
    );

    expect(metrics.summary()).toEqual({
      windowSeconds: 10,
      lineCount: 2,
      linesPerSecond: 0.2,
      structuralSuccessShare: 0.5,
      resolutionCoverage: {
        AUTO_RESOLVED: 1,
        NEEDS_REVIEW: 1,
        UNRESOLVED: 1,
        VERIFIED: 0,
      },
      averageCandidatesPerSegment: 4 / 3,
      unknownTokens: 2,
      lexiconRevision: 8,
    });

    clock = 11_500;
    expect(metrics.summary().lineCount).toBe(1);
  });

  it("reports nulls before any line and caps the samples it keeps", () => {
    const metrics = createIngredientMetrics({ maxSamples: 2, now: () => 0 });
    expect(metrics.summary()).toMatchObject({
      lineCount: 0,
      structuralSuccessShare: null,
      averageCandidatesPerSegment: null,
      lexiconRevision: null,
    });

    for (const revision of [1, 2, 3]) metrics.record(sample({ lexiconRevision: revision }));
    expect(metrics.summary()).toMatchObject({ lineCount: 2, lexiconRevision: 3 });

    metrics.reset();
    expect(metrics.summary().lineCount).toBe(0);
  });

  it("treats a line without mentions as having no candidates", () => {
    const metrics = createIngredientMetrics({ now: () => 0 });
    metrics.record(sample({ syntaxStatus: "FAILED", resolutionStatuses: [], candidateCount: 0 }));
    expect(metrics.summary()).toMatchObject({
      structuralSuccessShare: 0,
      averageCandidatesPerSegment: null,
    });
  });
});

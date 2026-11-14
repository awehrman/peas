import { describe, expect, it } from "vitest";

import {
  STRUCTURE_CLASSIFIER_VERSION,
  type ShadowNoteResult,
  buildShadowReport,
  segmentContent,
  shadowNote,
  storedDrift,
  summarizeShadow,
} from "../structure/index.js";

const SAUCE = [
  "For the sauce:",
  "2 tbsp butter",
  "1 cup cream",
  "",
  "Whisk the butter and cream until smooth.",
  "",
];
const STEPS = [
  "2 cups flour",
  "",
  "Whisk the flour and salt in a large bowl.",
  "Bake for 12 minutes, until golden.",
];
const CLEAN = [
  "2 cups flour",
  "1 tsp salt",
  "",
  "Whisk everything together.",
  "",
];

describe("storedDrift", () => {
  const blocks = segmentContent([
    "2 eggs",
    "1 cup milk",
    "",
    "Whisk everything together.",
    "",
  ]);

  it("is empty when the stored rows match the rebuilt filing (ignoring surrounding spaces)", () => {
    expect(
      storedDrift(blocks, {
        ingredients: [
          { blockIndex: 0, lineIndex: 0, reference: "2 eggs" },
          { blockIndex: 0, lineIndex: 1, reference: " 1 cup milk " },
        ],
        instructions: [
          { lineIndex: 0, reference: "Whisk everything together." },
        ],
      })
    ).toEqual({ missing: [], unexpected: [] });
  });

  it("lists lines on either side that don't match", () => {
    expect(
      storedDrift(blocks, {
        ingredients: [{ blockIndex: 0, lineIndex: 0, reference: "3 eggs" }],
        instructions: [
          { lineIndex: 0, reference: "Whisk everything together." },
        ],
      })
    ).toEqual({
      missing: ["ingredient 0.0: 2 eggs", "ingredient 0.1: 1 cup milk"],
      unexpected: ["ingredient 0.0: 3 eggs"],
    });
  });
});

describe("shadowNote", () => {
  it("validates a note and checks stored rows only when given", () => {
    const result = shadowNote({ id: "n1", title: "Cream sauce", lines: SAUCE });
    expect(result).toMatchObject({
      id: "n1",
      title: "Cream sauce",
      blocks: 4,
      drift: null,
    });
    expect(result.findings.map((finding) => finding.contentIndex)).toEqual([0]);
    expect(
      shadowNote({
        id: "n2",
        title: null,
        lines: CLEAN,
        stored: { ingredients: [], instructions: [] },
      }).drift?.missing
    ).toHaveLength(3);
  });
});

describe("summarizeShadow and buildShadowReport", () => {
  const results: ShadowNoteResult[] = [
    shadowNote({ id: "a", title: "Cream sauce", lines: SAUCE }),
    shadowNote({ id: "b", title: "Biscuits", lines: STEPS }),
    shadowNote({
      id: "c",
      title: "Clean",
      lines: CLEAN,
      stored: {
        ingredients: [
          { blockIndex: 0, lineIndex: 0, reference: "2 cups flour" },
          { blockIndex: 0, lineIndex: 1, reference: "1 tsp salt" },
        ],
        instructions: [
          { lineIndex: 0, reference: "Whisk everything together." },
        ],
      },
    }),
    shadowNote({
      id: "d",
      title: "Edited",
      lines: CLEAN,
      stored: {
        ingredients: [
          { blockIndex: 0, lineIndex: 0, reference: "2 cups flour" },
        ],
        instructions: [],
      },
    }),
  ];

  it("totals findings by transition and checks stored rows", () => {
    const summary = summarizeShadow(results, {
      source: "database",
      failedNotes: 1,
    });
    expect(summary).toMatchObject({
      classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
      source: "database",
      notes: 4,
      failedNotes: 1,
      blocks: 13,
      notesWithFindings: 2,
      findings: 3,
      transitions: [
        { assigned: "INGREDIENT", proposed: "INSTRUCTION", count: 2 },
        { assigned: "INGREDIENT", proposed: "SECTION_HEADING", count: 1 },
      ],
      notesCheckedAgainstStored: 2,
      notesWithDrift: 1,
    });
    expect(summary.driftExamples[0]).toMatchObject({
      noteId: "d",
      drift: { missing: expect.any(Array), unexpected: [] },
    });
  });

  it("samples round-robin across proposal kinds, stably", () => {
    const sample = summarizeShadow(results, {
      source: "database",
      sampleSize: 2,
    }).sample;
    expect(sample.map((row) => row.proposed).sort()).toEqual([
      "INSTRUCTION",
      "SECTION_HEADING",
    ]);
    expect(
      summarizeShadow(results, { source: "database", sampleSize: 2 }).sample
    ).toEqual(sample);
    expect(
      summarizeShadow(results, { source: "database" }).sample
    ).toHaveLength(3);
  });

  it("writes a report with totals, proposals, stored-line drift, and a review sample", () => {
    const report = buildShadowReport(
      summarizeShadow(results, { source: "database", failedNotes: 1 })
    );
    expect(report).toContain("| 4 | 1 | 13 | 2 (50.0%) | 3 | 230.8 |");
    expect(report).toContain("| INGREDIENT | SECTION_HEADING | 1 |");
    expect(report).toContain(
      "1 of 2 notes have stored ingredient or instruction lines that differ"
    );
    expect(report).toContain(
      "- Edited (`d`): 2 rebuilt lines not stored, 0 stored lines not rebuilt"
    );
    expect(report).toContain("rebuilt only: ingredient 0.1: 1 tsp salt");
    expect(report).toMatch(
      /\|  \| Cream sauce \| 0 \| For the sauce: \| INGREDIENT \| SECTION_HEADING \|/
    );
  });

  it("reports an empty run plainly", () => {
    const report = buildShadowReport(
      summarizeShadow([], { source: "directory /tmp/none" })
    );
    expect(report).toContain("| 0 | 0 | 0 | 0 (n/a) | 0 | n/a |");
    expect(report).toContain("## Proposals\n\nNone.");
    expect(report).toContain("Not checked (the source has no stored lines).");
    expect(report).toContain("No findings to review.");
  });

  it("escapes table characters in note text", () => {
    const piped = shadowNote({
      id: "e",
      title: "A | B",
      lines: ["For the dip | spread:", "2 tbsp tahini"],
    });
    const report = buildShadowReport(
      summarizeShadow([piped], { source: "database" })
    );
    expect(report).toContain("A \\| B");
  });
});

import { STRUCTURE_CLASSIFIER_VERSION } from "@peas/parser/v2";
import { describe, expect, it, vi } from "vitest";

import {
  createStructureShadowMetrics,
  runStructureShadow,
} from "../../note/structure-shadow";

const AT = new Date("2026-11-13T20:00:00.000Z");

function logger() {
  return { log: vi.fn() };
}

const misfiled = [
  "For the sauce:",
  "2 tbsp butter",
  "1 cup cream",
  "",
  "Whisk the butter and cream until smooth.",
  "",
].join("\n");

const clean = [
  "2 cups flour",
  "1 tsp salt",
  "",
  "Whisk everything together.",
  "",
].join("\n");

describe("runStructureShadow", () => {
  it("logs and counts findings without changing anything", () => {
    const metrics = createStructureShadowMetrics({ now: () => AT });
    const log = logger();

    const findings = runStructureShadow(
      { title: "Cream sauce", contents: misfiled },
      log,
      metrics
    );

    expect(findings).toHaveLength(1);
    expect(log.log).toHaveBeenCalledWith(
      "[STRUCTURE_SHADOW] Cream sauce: 1 finding in 4 blocks (SECTION_HEADING 1)"
    );
    expect(metrics.summary()).toEqual({
      classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
      notes: 1,
      blocks: 4,
      notesWithFindings: 1,
      findings: 1,
      byProposal: { SECTION_HEADING: 1 },
      failures: 0,
      recent: [
        {
          at: AT.toISOString(),
          title: "Cream sauce",
          contentIndex: 0,
          text: "For the sauce:",
          assigned: "INGREDIENT",
          proposed: "SECTION_HEADING",
          margin: expect.any(Number),
        },
      ],
    });
  });

  it("stays quiet for a correctly filed note but still counts it", () => {
    const metrics = createStructureShadowMetrics();
    const log = logger();
    expect(
      runStructureShadow({ title: null, contents: clean }, log, metrics)
    ).toEqual([]);
    expect(log.log).not.toHaveBeenCalled();
    expect(metrics.summary()).toMatchObject({
      notes: 1,
      blocks: 3,
      notesWithFindings: 0,
      findings: 0,
    });
  });

  it("names untitled notes and pluralizes", () => {
    const log = logger();
    runStructureShadow(
      {
        title: null,
        contents: [
          "For the sauce:",
          "2 tbsp butter",
          "",
          "Combine.",
          "Stir well until thick.",
        ].join("\n"),
      },
      log,
      createStructureShadowMetrics()
    );
    expect(log.log).toHaveBeenCalledWith(
      "[STRUCTURE_SHADOW] Untitled: 3 findings in 4 blocks (SECTION_HEADING 1, INSTRUCTION 2)"
    );
  });

  it("keeps only the most recent findings", () => {
    const metrics = createStructureShadowMetrics();
    for (let index = 0; index < 30; index += 1)
      runStructureShadow(
        { title: `Note ${index}`, contents: misfiled },
        logger(),
        metrics
      );
    const summary = metrics.summary();
    expect(summary.findings).toBe(30);
    expect(summary.recent).toHaveLength(25);
    expect(summary.recent[24]?.title).toBe("Note 29");
  });

  it("never throws: a failure is counted and logged", () => {
    const metrics = createStructureShadowMetrics();
    const log = logger();
    const broken = { title: "Broken", contents: null as unknown as string };
    expect(runStructureShadow(broken, log, metrics)).toEqual([]);
    expect(metrics.summary().failures).toBe(1);
    expect(log.log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[STRUCTURE_SHADOW\] Validation failed/)
    );
  });

  it("records into the process-wide metrics by default", async () => {
    const { structureShadowMetrics } =
      await import("../../note/structure-shadow");
    const before = structureShadowMetrics.summary().notes;
    runStructureShadow({ title: "Default", contents: clean }, logger());
    expect(structureShadowMetrics.summary().notes).toBe(before + 1);
  });
});

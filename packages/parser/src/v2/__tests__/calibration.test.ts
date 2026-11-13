import { describe, expect, it } from "vitest";

import {
  type CalibrationCase,
  calibrateThresholds,
  formatCalibrationReport,
} from "../resolve/calibration";

import { loadSemanticFixture, snapshotFromFixture } from "./helpers/resolver";

const snapshot = snapshotFromFixture(loadSemanticFixture());
const grid = { minMargins: [0.15, 0.3], maxUnknowns: [0, 1] };

const known: CalibrationCase[] = [
  { input: "1 cup whole milk", expected: "whole-milk", source: "semantic" },
  { input: "2 green apples", expected: "apple", source: "semantic" },
  { input: "3 cups flibber", expected: null, source: "verified" },
];
const unknownNextToFood: CalibrationCase = {
  input: "1 cup zorbly milk",
  expected: "milk",
  source: "verified",
};

describe("calibrateThresholds", () => {
  it("recommends the setting that covers more lines at the target, leaving knobs that change nothing as they are", () => {
    const result = calibrateThresholds(
      [{ snapshot, cases: [...known, unknownNextToFood] }],
      grid
    );

    expect(result.rows).toHaveLength(4);
    expect(result.bySource).toEqual({ semantic: 2, verified: 2 });
    expect(result.current).toMatchObject({
      minMargin: 0.15,
      maxUnknownForAuto: 0,
      autoResolved: 2,
      coverage: 0.5,
    });
    expect(result.recommended).toMatchObject({
      minMargin: 0.15,
      maxUnknownForAuto: 1,
      autoResolved: 3,
      correct: 3,
      precision: 1,
      coverage: 0.75,
    });
  });

  it("keeps the current setting when nothing more permissive helps, and says which knobs never move", () => {
    const result = calibrateThresholds([{ snapshot, cases: known }], grid);
    expect(result.recommended).toBe(result.current);

    const report = formatCalibrationReport(result, {
      resolverVersion: "1.0.0",
      sources: "fixtures/golden/semantic.json",
    });
    expect(report).toContain("- Recommended: keep the current setting");
    expect(report).toContain("`minMargin` changes nothing on these labels");
    expect(report).toContain(
      "`maxUnknownForAuto` changes nothing on these labels"
    );
    expect(report).toContain("(2 semantic, 1 verified)");
    expect(report).toContain("| 0.3 | 1 | 2 | 2 | 100.0% | 66.7% |");
  });

  it("counts an auto-resolution of a line labeled unresolved as wrong, and recommends nothing below the target", () => {
    const result = calibrateThresholds(
      [
        {
          snapshot,
          cases: [
            { input: "1 cup whole milk", expected: null, source: "verified" },
          ],
        },
      ],
      grid
    );
    expect(result.rows.every((row) => row.precision === 0)).toBe(true);
    expect(result.recommended).toBeNull();

    const report = formatCalibrationReport(result, {
      resolverVersion: "1.0.0",
      sources: "verified mentions",
    });
    expect(report).toContain("- Recommended: none");
  });

  it("notes only the knob that changes nothing when the other one matters", () => {
    const result = calibrateThresholds(
      [{ snapshot, cases: [...known, unknownNextToFood] }],
      grid
    );
    const report = formatCalibrationReport(result, {
      resolverVersion: "1.0.0",
      sources: "fixtures/golden/semantic.json",
    });
    expect(report).toContain(
      "- Recommended: minMargin 0.15, maxUnknownForAuto 1"
    );
    expect(report).toContain("`minMargin` changes nothing");
    expect(report).not.toContain("`maxUnknownForAuto` changes nothing");
  });
});

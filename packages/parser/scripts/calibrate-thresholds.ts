/**
 * Calibrates the automatic-resolution thresholds (Phase 6g): precision and coverage for a grid of `minMargin` and `maxUnknownForAuto`, labeled by fixtures/golden/semantic.json (resolved with the semantic fixture lexicon) plus, with `--labels`, verified mentions exported from the database by `yarn workspace @peas/database export:calibration-labels`. Writes fixtures/reports/calibration.md.
 *
 * Usage: yarn calibrate:thresholds [--labels path] [--target 0.98] [--out path]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { loadFixture } from "../src/v2/__tests__/helpers/golden.js";
import {
  loadSemanticFixture,
  snapshotFromFixture,
} from "../src/v2/__tests__/helpers/resolver.js";
import {
  type CalibrationGroup,
  calibrateThresholds,
  formatCalibrationReport,
} from "../src/v2/resolve/calibration.js";
import { ResolverSnapshotSchema } from "../src/v2/resolve/context.js";
import { RESOLVER_VERSION } from "../src/v2/resolve/version.js";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({
  options: {
    labels: { type: "string" },
    target: { type: "string", default: "0.98" },
    out: {
      type: "string",
      default: join(packageDir, "fixtures/reports/calibration.md"),
    },
  },
});

const targetPrecision = Number.parseFloat(values.target);
if (!(targetPrecision > 0 && targetPrecision <= 1))
  throw new Error("--target must be between 0 and 1");

const groups: CalibrationGroup[] = [
  {
    snapshot: snapshotFromFixture(loadSemanticFixture()),
    cases: loadFixture<{
      cases: { input: string; expected: { concept: string | null } }[];
    }>("golden/semantic.json").cases.map((semanticCase) => ({
      input: semanticCase.input,
      expected: semanticCase.expected.concept,
      source: "semantic" as const,
    })),
  },
];
const sources = ["fixtures/golden/semantic.json"];
if (values.labels) {
  const exported = JSON.parse(readFileSync(resolve(values.labels), "utf8")) as {
    snapshot: unknown;
    cases: { input: string; expected: string | null }[];
  };
  groups.push({
    snapshot: ResolverSnapshotSchema.parse(exported.snapshot),
    cases: exported.cases.map((labeled) => ({
      input: labeled.input,
      expected: labeled.expected,
      source: "verified" as const,
    })),
  });
  sources.push(
    `verified mentions (${relative(process.cwd(), resolve(values.labels))})`
  );
}

const result = calibrateThresholds(groups, { targetPrecision });
writeFileSync(
  values.out,
  formatCalibrationReport(result, {
    resolverVersion: RESOLVER_VERSION,
    sources: sources.join(" and "),
  })
);
console.log(
  `Wrote ${relative(process.cwd(), values.out)}; recommended ${
    result.recommended
      ? `minMargin ${result.recommended.minMargin}, maxUnknownForAuto ${result.recommended.maxUnknownForAuto}`
      : "nothing (no setting meets the target)"
  }`
);

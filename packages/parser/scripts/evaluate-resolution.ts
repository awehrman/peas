/**
 * Resolution report over a resolver snapshot (Phase 3i). Lines are the corpus plus the structural golden inputs; precision comes from fixtures/golden/semantic.json. Writes fixtures/reports/resolution.md.
 *
 * By default the snapshot is fixtures/lexicon/snapshot.json, regenerated from fixtures/lexicon/semantic-cases.json on each run. Pass `--snapshot <path>` to read any ResolverSnapshot JSON instead (for example one exported with `yarn workspace @peas/database db:evaluate:resolution --export-snapshot <path>`). For the live database use that database script directly.
 *
 * Usage: yarn evaluate:resolution [--snapshot path] [--out path]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  loadCorpus,
  loadFixture,
  loadGoldenCases,
} from "../src/v2/__tests__/helpers/golden.js";
import {
  loadSemanticFixture,
  snapshotFromFixture,
} from "../src/v2/__tests__/helpers/resolver.js";
import {
  ResolverSnapshotSchema,
  buildResolverContext,
} from "../src/v2/resolve/context.js";
import {
  type SemanticReportCase,
  buildResolutionReport,
} from "../src/v2/resolve/report.js";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultSnapshotPath = join(packageDir, "fixtures/lexicon/snapshot.json");

const { values } = parseArgs({
  options: {
    snapshot: { type: "string" },
    out: {
      type: "string",
      default: join(packageDir, "fixtures/reports/resolution.md"),
    },
  },
});

let snapshotPath = defaultSnapshotPath;
if (values.snapshot) {
  snapshotPath = resolve(values.snapshot);
} else {
  writeFileSync(
    defaultSnapshotPath,
    `${JSON.stringify(snapshotFromFixture(loadSemanticFixture()), null, 2)}\n`
  );
}
const snapshot = ResolverSnapshotSchema.parse(
  JSON.parse(readFileSync(snapshotPath, "utf8"))
);

const lines = [
  ...new Set([
    ...loadCorpus().map((line) => line.text),
    ...loadGoldenCases("structural.dev").map((goldenCase) => goldenCase.input),
    ...loadGoldenCases("structural.holdout").map(
      (goldenCase) => goldenCase.input
    ),
  ]),
];
const semanticCases: SemanticReportCase[] = loadFixture<{
  cases: { id: string; input: string; expected: { concept: string | null } }[];
}>("golden/semantic.json").cases.map((semanticCase) => ({
  id: semanticCase.id,
  input: semanticCase.input,
  expectedConcept: semanticCase.expected.concept,
}));

const report = buildResolutionReport({
  source: relative(packageDir, snapshotPath),
  lines,
  context: buildResolverContext(snapshot),
  semanticCases,
});
mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, report);
console.log(
  `Wrote ${relative(process.cwd(), values.out)} (${lines.length} lines, ${semanticCases.length} semantic cases)`
);

/**
 * Dry-run reparse (Phase 6d): parses every active line with the working-tree parser and the current lexicon, compares with the stored mentions, and writes packages/parser/fixtures/reports/reparse-<version>.md. Nothing is written to the database. Attach the report to the grammar change's pull request.
 *
 *   yarn workspace @peas/queue reparse:dry-run [--examples 50] [--limit <lines>]
 */
import "../src/config/load-env";

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { dryRunReparse, formatReparseReport, loadResolverSnapshot, prisma } from "@peas/database";
import { buildResolverContext } from "@peas/parser/v2";

const { values } = parseArgs({
  options: {
    examples: { type: "string", default: "50" },
    limit: { type: "string" },
  },
});

async function main(): Promise<void> {
  const examplesPerCategory = Number.parseInt(values.examples, 10);
  if (!Number.isInteger(examplesPerCategory) || examplesPerCategory < 0)
    throw new Error("--examples must be a non-negative integer");
  const lineLimit = values.limit ? Number.parseInt(values.limit, 10) : Number.POSITIVE_INFINITY;

  const context = buildResolverContext(await loadResolverSnapshot());
  const report = await dryRunReparse(context, { examplesPerCategory, lineLimit });
  const path = join(
    dirname(fileURLToPath(import.meta.url)),
    `../../../packages/parser/fixtures/reports/reparse-${report.parserVersion}.md`
  );
  writeFileSync(path, formatReparseReport(report));
  console.log(
    `Parser ${report.parserVersion}: ${report.linesScanned} lines, ${report.mentionsCompared} mentions compared; ` +
      Object.entries(report.counts)
        .map(([category, count]) => `${category} ${count}`)
        .join(", ") +
      `; ${report.verifiedConflicts.length} verified conflicts. Report: ${path}`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

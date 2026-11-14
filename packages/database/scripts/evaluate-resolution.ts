#!/usr/bin/env tsx
/**
 * Resolution report against the live database (Phase 3i `--db` mode): the snapshot comes from loadResolverSnapshot and the lines from stored ParsedIngredientLine references. Semantic precision uses packages/parser/fixtures/golden/semantic.json, matched by concept name. Writes packages/parser/fixtures/reports/resolution.db.md; read-only.
 *
 * Usage:
 *   yarn workspace @peas/database db:evaluate:resolution [--limit 5000] [--out path] [--export-snapshot path]
 */
import {
  type SemanticReportCase,
  buildResolutionReport,
  buildResolverContext,
} from "@peas/parser/v2";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { prisma } from "../src/client.js";
import { loadResolverSnapshot } from "../src/repository/ontology/resolver-context.js";

const parserDir = join(dirname(fileURLToPath(import.meta.url)), "../../parser");

const { values } = parseArgs({
  options: {
    limit: { type: "string", default: "5000" },
    out: {
      type: "string",
      default: join(parserDir, "fixtures/reports/resolution.db.md"),
    },
    "export-snapshot": { type: "string" },
  },
});

async function main(): Promise<void> {
  const limit = Number.parseInt(values.limit, 10);
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("--limit must be a positive integer");

  const snapshot = await loadResolverSnapshot();
  if (values["export-snapshot"])
    writeFileSync(
      resolve(values["export-snapshot"]),
      `${JSON.stringify(snapshot, null, 2)}\n`
    );

  const rows = await prisma.parsedIngredientLine.findMany({
    distinct: ["reference"],
    select: { reference: true },
    orderBy: { reference: "asc" },
    take: limit,
  });
  const golden = JSON.parse(
    readFileSync(join(parserDir, "fixtures/golden/semantic.json"), "utf8")
  ) as {
    cases: {
      id: string;
      input: string;
      expected: { concept: string | null };
    }[];
  };
  const semanticCases: SemanticReportCase[] = golden.cases.map(
    (semanticCase) => ({
      id: semanticCase.id,
      input: semanticCase.input,
      expectedConcept: semanticCase.expected.concept,
    })
  );

  const report = buildResolutionReport({
    source: "database",
    lines: rows.map((row) => row.reference),
    context: buildResolverContext(snapshot),
    semanticCases,
  });
  mkdirSync(dirname(values.out), { recursive: true });
  writeFileSync(values.out, report);
  console.log(
    `Wrote ${values.out} (${rows.length} lines, revision ${snapshot.revision})`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

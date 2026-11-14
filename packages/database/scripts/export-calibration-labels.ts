#!/usr/bin/env tsx
/**
 * Exports verified mentions as calibration labels (Phase 6g) for `yarn workspace @peas/parser calibrate:thresholds --labels <file>`: each active line whose first mention a reviewer verified, with the concept they chose (null when they verified that nothing matches), plus the resolver snapshot to resolve them with. Read-only.
 *
 * Usage:
 *   yarn workspace @peas/database export:calibration-labels [--out path] [--limit 5000]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { prisma } from "../src/client.js";
import { loadResolverSnapshot } from "../src/repository/ontology/resolver-context.js";

const parserDir = join(dirname(fileURLToPath(import.meta.url)), "../../parser");

const { values } = parseArgs({
  options: {
    out: {
      type: "string",
      default: join(parserDir, "fixtures/reports/calibration-labels.json"),
    },
    limit: { type: "string", default: "5000" },
  },
});

async function main(): Promise<void> {
  const limit = Number.parseInt(values.limit, 10);
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("--limit must be a positive integer");

  const [snapshot, verified] = await Promise.all([
    loadResolverSnapshot(),
    prisma.ingredientMention.findMany({
      where: {
        resolutionStatus: "VERIFIED",
        segmentIndex: 0,
        partIndex: 0,
        parsedLine: { isActive: true },
      },
      select: { conceptId: true, parsedLine: { select: { reference: true } } },
      orderBy: { id: "asc" },
      take: limit,
    }),
  ]);

  const seen = new Set<string>();
  const cases = verified
    .filter(({ parsedLine }) => {
      if (seen.has(parsedLine.reference)) return false;
      seen.add(parsedLine.reference);
      return true;
    })
    .map(({ conceptId, parsedLine }) => ({
      input: parsedLine.reference,
      expected: conceptId,
    }));

  const out = resolve(values.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify({ snapshot, cases }, null, 2)}\n`);
  console.log(
    `Wrote ${cases.length} verified labels (revision ${snapshot.revision}) to ${out}`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

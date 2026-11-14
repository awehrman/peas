#!/usr/bin/env tsx
/**
 * Pulls a structural pattern's example lines into a pending fixture file (Phase 6b): packages/parser/fixtures/golden/pending/<signature>.json, with v2's current reading of each line and empty expected values. Fill in `expected`, then move the cases into structural.dev.json; they fail until the grammar learns the structure.
 *
 * Lives here rather than in @peas/parser so the parser package never depends on the database.
 *
 * Usage:
 *   yarn workspace @peas/parser pull:fixtures --discovery <id> [--limit 10]
 *   yarn workspace @peas/parser pull:fixtures --signature "W U" [--limit 10]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  PARSER_VERSION,
  buildResolverContext,
  describeSyntax,
  draftGoldenCases,
  fixtureSlug,
  processIngredientLine,
} from "@peas/parser/v2";

import { prisma } from "../src/client.js";
import { pendingFixtureLines } from "../src/repository/ontology/grammar-loop.js";
import { loadResolverSnapshot } from "../src/repository/ontology/resolver-context.js";

const { values } = parseArgs({
  options: {
    discovery: { type: "string" },
    signature: { type: "string" },
    limit: { type: "string", default: "10" },
  },
});

async function main(): Promise<void> {
  const limit = Number.parseInt(values.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer");
  if (!values.discovery && !values.signature)
    throw new Error("Pass --discovery <id> or --signature <signature>");

  let signature = values.signature;
  if (values.discovery) {
    const discovery = await prisma.discovery.findUnique({
      where: { id: values.discovery },
      select: { type: true, key: true },
    });
    if (!discovery) throw new Error(`Discovery ${values.discovery} does not exist`);
    if (discovery.type !== "STRUCTURAL_PATTERN")
      throw new Error(`Discovery ${values.discovery} is ${discovery.type}, not a structural pattern`);
    signature = discovery.key;
  }

  const lines = await pendingFixtureLines({
    discoveryId: values.discovery,
    signature: values.discovery ? undefined : signature,
    limit,
  });
  if (lines.length === 0) throw new Error("No lines show that structure");

  const context = buildResolverContext(await loadResolverSnapshot());
  const cases = draftGoldenCases(
    signature ?? "",
    lines.map((line) => ({
      input: line.input,
      current: describeSyntax(processIngredientLine(line.input, context).line),
    }))
  );
  const directory = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../parser/fixtures/golden/pending"
  );
  mkdirSync(directory, { recursive: true });
  const path = join(directory, `${fixtureSlug(signature ?? "")}.json`);
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        signature,
        discoveryId: values.discovery ?? null,
        parserVersion: PARSER_VERSION,
        note: "Fill in each case's expected value, then move the cases into structural.dev.json.",
        cases,
      },
      null,
      2
    )}\n`
  );
  console.log(`Wrote ${cases.length} pending cases for "${signature}" to ${path}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

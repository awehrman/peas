#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
/**
 * Exports the database-authored ("dynamic") grammars to
 * packages/parser/legacy/dynamic-archive/ so they survive the removal of the
 * grammar tables. Uses raw SQL because the Prisma models no longer exist once
 * the tables are dropped; tables that are already gone are skipped.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createScriptClient } from "./prisma-client.js";

const prisma = createScriptClient();
const scriptDir = dirname(fileURLToPath(import.meta.url));
const archiveDir = join(
  scriptDir,
  "../../parser/legacy/dynamic-archive"
);

async function tableExists(table) {
  const [row] = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."${table}"') IS NOT NULL AS "exists"`
  );
  return row.exists;
}

async function selectAll(table, orderBy) {
  if (!(await tableExists(table))) {
    console.warn(`Table ${table} does not exist; skipping`);
    return [];
  }
  return prisma.$queryRawUnsafe(
    `SELECT * FROM "${table}" ORDER BY ${orderBy}`
  );
}

function writeJson(relativePath, value) {
  const target = join(archiveDir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const rules = await selectAll("GrammarRule", `"order", "name"`);
  const definitions = await selectAll(
    "GrammarRuleDefinition",
    `"grammarRuleId", "order"`
  );
  const tests = await selectAll("GrammarTest", `"createdAt"`);
  const expectations = await selectAll(
    "GrammarTestExpectation",
    `"grammarTestId", "order"`
  );
  const versions = await selectAll("GrammarVersion", `"publishedAt"`);
  const settings = await selectAll("AppSetting", `"id"`);

  writeJson(
    "rules.json",
    rules.map((rule) => ({
      ...rule,
      definitions: definitions.filter((d) => d.grammarRuleId === rule.id),
    }))
  );
  writeJson(
    "tests.json",
    tests.map((test) => ({
      ...test,
      expectations: expectations.filter((e) => e.grammarTestId === test.id),
    }))
  );

  mkdirSync(join(archiveDir, "versions"), { recursive: true });
  for (const version of versions) {
    const stamp = new Date(version.publishedAt)
      .toISOString()
      .replace(/[:.]/g, "-");
    writeFileSync(
      join(archiveDir, "versions", `${stamp}-${version.id}.peggy`),
      version.source
    );
  }
  writeJson(
    "versions/index.json",
    versions.map(({ source: _source, ...meta }) => meta)
  );
  writeJson("settings.json", settings);

  console.log(
    `Archived ${rules.length} rules, ${tests.length} tests, ${versions.length} published versions to ${archiveDir}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

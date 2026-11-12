#!/usr/bin/env node
/**
 * Runs the v1 parser (dist/v1, see `yarn build`) over the corpus and writes
 * fixtures/baseline/v1.jsonl. The baseline is a reference for comparison
 * reports, not ground truth.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ensureV1Parser } from "./ensure-v1.js";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpusPath = join(packageDir, "fixtures/corpus/lines.jsonl");
const outputPath = join(packageDir, "fixtures/baseline/v1.jsonl");

const { parse } = await import(ensureV1Parser());

const rows = readFileSync(corpusPath, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const results = rows.map(({ text }) => {
  try {
    const result = parse(text);
    return {
      text,
      rule: result.rule,
      segments: result.values.map((segment) => ({ type: segment.type, value: String(segment.value) })),
    };
  } catch (error) {
    return { text, error: error instanceof Error ? error.message : String(error) };
  }
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, results.map((row) => JSON.stringify(row)).join("\n") + "\n");
const failures = results.filter((row) => row.error).length;
console.log(`Wrote ${results.length} v1 results (${failures} failures) to ${outputPath}`);

#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
/**
 * Exports distinct ingredient lines to packages/parser/fixtures/corpus/lines.jsonl
 * for parser regression tests and reports. Each row is
 * { text, occurrences, distinctNotes, sources }.
 *
 * Sources:
 *   - ParsedIngredientLine.reference in the database (always)
 *   - queue worker logs, via --log <path> (repeatable), for lines from imports
 *     that are no longer in the database
 *
 * Usage:
 *   yarn workspace @peas/database export:lines [--log ../../apps/queue/logs/<file>]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createScriptClient } from "./prisma-client.js";

const prisma = createScriptClient();
const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = join(scriptDir, "../../parser/fixtures/corpus/lines.jsonl");

const NOTE_START = /\[SCHEDULE_INGREDIENTS\] Starting ingredient processing for note: (\S+)/;
const INGREDIENT = /\[SCHEDULE_INGREDIENTS\] Processing ingredient: (.*)$/;

function logPathsFromArgs(argv) {
  const paths = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--log" && argv[i + 1]) paths.push(resolve(argv[++i]));
  }
  return paths;
}

function addLine(lines, text, noteKey, source) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const row = lines.get(trimmed) ?? {
    text: trimmed,
    occurrences: 0,
    notes: new Set(),
    sources: new Set(),
  };
  row.occurrences += 1;
  if (noteKey) row.notes.add(noteKey);
  row.sources.add(source);
  lines.set(trimmed, row);
}

async function addDatabaseLines(lines) {
  const rows = await prisma.parsedIngredientLine.findMany({
    select: { reference: true, noteId: true },
  });
  for (const row of rows) addLine(lines, row.reference, row.noteId, "db");
  return rows.length;
}

function addLogLines(lines, path) {
  let currentNote = null;
  let count = 0;
  for (const logLine of readFileSync(path, "utf8").split("\n")) {
    const noteMatch = NOTE_START.exec(logLine);
    if (noteMatch) {
      currentNote = noteMatch[1];
      continue;
    }
    const ingredientMatch = INGREDIENT.exec(logLine);
    if (ingredientMatch) {
      addLine(lines, ingredientMatch[1], currentNote ? `log:${currentNote}` : null, "log");
      count += 1;
    }
  }
  return count;
}

async function main() {
  const lines = new Map();
  const databaseCount = await addDatabaseLines(lines);
  let logCount = 0;
  for (const path of logPathsFromArgs(process.argv.slice(2))) {
    logCount += addLogLines(lines, path);
  }

  const rows = [...lines.values()]
    .map((row) => ({
      text: row.text,
      occurrences: row.occurrences,
      distinctNotes: row.notes.size,
      sources: [...row.sources].sort(),
    }))
    .sort((a, b) => b.distinctNotes - a.distinctNotes || a.text.localeCompare(b.text));

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
  console.log(
    `Wrote ${rows.length} distinct lines (${databaseCount} database rows, ${logCount} log rows) to ${outputPath}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

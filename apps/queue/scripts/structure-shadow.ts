/**
 * Shadow run of the recipe structure validator (Phase 8.5-B): segments and validates every stored note (or every exported Evernote HTML file under --dir) and writes packages/parser/fixtures/reports/structure-shadow.md, with a review sample, plus every finding as JSON lines in logs/. Nothing is written to the database. Stored notes are also checked against their saved ingredient and instruction rows, which shows whether provenance rebuilt from Note.html is exact.
 *
 *   yarn workspace @peas/queue structure:shadow [--dir <folder>] [--limit <notes>] [--sample 200] [--lexicon]
 */
import { loadResolverSnapshot, prisma } from "@peas/database";
import {
  type BlockFeatureOptions,
  type ShadowNoteResult,
  buildResolverContext,
  buildShadowReport,
  shadowNote,
  splitStoredContent,
  summarizeShadow,
} from "@peas/parser/v2";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import "../src/config/load-env";

const BATCH_SIZE = 200;
const scriptDir = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({
  options: {
    dir: { type: "string" },
    limit: { type: "string" },
    sample: { type: "string", default: "200" },
    lexicon: { type: "boolean", default: false },
  },
});

function positiveInteger(
  value: string | undefined,
  name: string
): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`--${name} must be a positive integer`);
  return parsed;
}

function htmlFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".html")
      ? [path]
      : [];
  });
}

async function fromDirectory(
  folder: string,
  limit: number,
  options: BlockFeatureOptions
): Promise<{ results: ShadowNoteResult[]; failed: number }> {
  const { parseHTMLContent } = await import("../src/parsers/html");
  const results: ShadowNoteResult[] = [];
  let failed = 0;
  for (const path of htmlFiles(folder).slice(0, limit)) {
    try {
      const file = parseHTMLContent(readFileSync(path, "utf8"), {
        logger: () => {},
      });
      results.push(
        shadowNote(
          {
            id: relative(folder, path),
            title: file.title,
            lines: splitStoredContent(file.contents),
          },
          options
        )
      );
    } catch (error) {
      failed += 1;
      console.warn(
        `Skipped ${path}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return { results, failed };
}

async function fromDatabase(
  limit: number,
  options: BlockFeatureOptions
): Promise<ShadowNoteResult[]> {
  const results: ShadowNoteResult[] = [];
  let cursor: string | undefined;
  while (results.length < limit) {
    const notes = await prisma.note.findMany({
      where: { archivedAt: null },
      orderBy: { id: "asc" },
      take: Math.min(BATCH_SIZE, limit - results.length),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        html: true,
        parsedIngredientLines: {
          select: { blockIndex: true, lineIndex: true, reference: true },
        },
        parsedInstructionLines: {
          select: { lineIndex: true, originalText: true },
        },
      },
    });
    if (notes.length === 0) break;
    for (const note of notes) {
      results.push(
        shadowNote(
          {
            id: note.id,
            title: note.title,
            lines: splitStoredContent(note.html),
            stored: {
              ingredients: note.parsedIngredientLines,
              instructions: note.parsedInstructionLines.map((line) => ({
                lineIndex: line.lineIndex,
                reference: line.originalText,
              })),
            },
          },
          options
        )
      );
    }
    cursor = notes[notes.length - 1]?.id;
    console.log(`Checked ${results.length} notes`);
  }
  return results;
}

async function main(): Promise<void> {
  const limit =
    positiveInteger(values.limit, "limit") ?? Number.POSITIVE_INFINITY;
  const sampleSize = positiveInteger(values.sample, "sample") ?? 200;
  const options: BlockFeatureOptions = values.lexicon
    ? { lexicon: buildResolverContext(await loadResolverSnapshot()).lexicon }
    : {};

  const folder = values.dir ? resolve(values.dir) : undefined;
  const { results, failed } = folder
    ? await fromDirectory(folder, limit, options)
    : { results: await fromDatabase(limit, options), failed: 0 };
  const source = `${folder ? `directory ${folder}` : "database"}${values.lexicon ? ", with the stored lexicon" : ", structure only"}`;
  const summary = summarizeShadow(results, {
    source,
    failedNotes: failed,
    sampleSize,
  });

  const reportPath = join(
    scriptDir,
    "../../../packages/parser/fixtures/reports/structure-shadow.md"
  );
  writeFileSync(reportPath, buildShadowReport(summary));

  const logsDir = join(scriptDir, "../logs");
  mkdirSync(logsDir, { recursive: true });
  const findingsPath = join(
    logsDir,
    `structure-shadow-${folder ? "files" : "database"}-${new Date().toISOString().slice(0, 10)}.jsonl`
  );
  writeFileSync(
    findingsPath,
    results
      .flatMap((result) =>
        result.findings.map((finding) =>
          JSON.stringify({ noteId: result.id, title: result.title, ...finding })
        )
      )
      .map((line) => `${line}\n`)
      .join("")
  );

  console.log(
    `${summary.notes} notes, ${summary.blocks} blocks, ${summary.findings} findings in ${summary.notesWithFindings} notes; ` +
      `${summary.notesWithDrift} of ${summary.notesCheckedAgainstStored} stored notes differ from their rebuilt filing. ` +
      `Report: ${reportPath}. Findings: ${findingsPath}`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    // The queue's HTML parser pulls in modules that start monitoring timers on import.
    process.exit();
  });

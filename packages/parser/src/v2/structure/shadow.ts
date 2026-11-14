import type { BlockFeatureOptions } from "./features.js";
import { segmentContent } from "./segment-content.js";
import type { ContentBlock } from "./types.js";
import {
  type StructureFinding,
  proposalLabel,
  validateStructure,
} from "./validate.js";
import { STRUCTURE_CLASSIFIER_VERSION } from "./version.js";

/**
 * The lines a note was saved with, as stored on ParsedIngredientLine and ParsedInstructionLine (active or not).
 *
 * @example
 * { ingredients: [{ blockIndex: 0, lineIndex: 0, reference: "2 eggs" }], instructions: [{ lineIndex: 0, reference: "Whisk." }] }
 */
export interface StoredFiling {
  ingredients: { blockIndex: number; lineIndex: number; reference: string }[];
  instructions: { lineIndex: number; reference: string }[];
}

/**
 * One note for a shadow run: its extracted content lines (`Note.html` split on newlines, or a fresh extraction of the exported HTML) and, for stored notes, the lines it was saved with.
 */
export interface ShadowNoteInput {
  id: string;
  title: string | null;
  lines: string[];
  stored?: StoredFiling;
}

/**
 * Lines rebuilt from content that the stored rows don't have (`missing`) and stored rows the content no longer produces (`unexpected`). Zero means the rebuilt provenance matches what was saved.
 */
export interface StoredDrift {
  missing: string[];
  unexpected: string[];
}

export interface ShadowNoteResult {
  id: string;
  title: string | null;
  blocks: number;
  findings: StructureFinding[];
  drift: StoredDrift | null;
}

function blockKey(block: ContentBlock): string {
  return block.assigned === "INGREDIENT"
    ? `ingredient ${block.blockIndex}.${block.lineIndex}: ${block.text}`
    : `instruction ${block.lineIndex}: ${block.text}`;
}

/**
 * Compares the filing rebuilt from content with the stored rows.
 *
 * @example
 * storedDrift(segmentContent(["2 eggs"]), { ingredients: [{ blockIndex: 0, lineIndex: 0, reference: "2 eggs" }], instructions: [] })
 * // { missing: [], unexpected: [] }
 */
export function storedDrift(
  blocks: readonly ContentBlock[],
  stored: StoredFiling
): StoredDrift {
  const rebuilt = new Set(blocks.map(blockKey));
  const saved = new Set([
    ...stored.ingredients.map(
      (line) =>
        `ingredient ${line.blockIndex}.${line.lineIndex}: ${line.reference.trim()}`
    ),
    ...stored.instructions.map(
      (line) => `instruction ${line.lineIndex}: ${line.reference.trim()}`
    ),
  ]);
  return {
    missing: [...rebuilt].filter((key) => !saved.has(key)),
    unexpected: [...saved].filter((key) => !rebuilt.has(key)),
  };
}

/**
 * Segments and validates one note without changing anything, and checks the rebuilt filing against the stored rows when they are given.
 *
 * @example
 * shadowNote({ id: "n1", title: "Chili", lines: ["For the sauce:", "2 tbsp butter"] }).findings.length // 1
 */
export function shadowNote(
  note: ShadowNoteInput,
  options: BlockFeatureOptions = {}
): ShadowNoteResult {
  const blocks = segmentContent(note.lines);
  return {
    id: note.id,
    title: note.title,
    blocks: blocks.length,
    findings: validateStructure(blocks, options).findings,
    drift: note.stored ? storedDrift(blocks, note.stored) : null,
  };
}

export interface ShadowSampleRow {
  noteId: string;
  title: string | null;
  contentIndex: number;
  text: string;
  assigned: string;
  proposed: string;
  margin: number;
  signals: string;
}

/**
 * Totals for a shadow run, the stored-row check, and a review sample.
 *
 * @example
 * { source: "database", notes: 500, blocks: 11204, notesWithFindings: 31, findings: 44, transitions: [{ assigned: "INGREDIENT", proposed: "SECTION_HEADING", count: 21 }], ... }
 */
export interface ShadowSummary {
  classifierVersion: string;
  source: string;
  notes: number;
  failedNotes: number;
  blocks: number;
  notesWithFindings: number;
  findings: number;
  transitions: { assigned: string; proposed: string; count: number }[];
  notesCheckedAgainstStored: number;
  notesWithDrift: number;
  driftExamples: { noteId: string; title: string | null; drift: StoredDrift }[];
  sample: ShadowSampleRow[];
}

/** FNV-1a, so the sample is spread across the corpus but identical on every run. */
function stableHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function strongestSignals(finding: StructureFinding): string {
  return [...finding.signals]
    .filter((item) => item.id !== "IMPORTER_SECTION")
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 3)
    .map((item) => `${item.id}${item.text ? ` (${item.text})` : ""}`)
    .join(", ");
}

/**
 * Summarizes per-note results. The review sample takes findings round-robin across proposal kinds (so rare kinds are reviewed too), in a stable pseudo-random order.
 *
 * @example
 * summarizeShadow(results, { source: "database", sampleSize: 200 })
 */
export function summarizeShadow(
  results: readonly ShadowNoteResult[],
  {
    source,
    failedNotes = 0,
    sampleSize = 200,
    driftExampleLimit = 20,
  }: {
    source: string;
    failedNotes?: number;
    sampleSize?: number;
    driftExampleLimit?: number;
  }
): ShadowSummary {
  const transitions = new Map<string, number>();
  const rowsByProposal = new Map<
    string,
    (ShadowSampleRow & { order: number })[]
  >();
  for (const result of results) {
    for (const finding of result.findings) {
      const proposed = proposalLabel(finding.proposal);
      const key = `${finding.assigned}\u0000${proposed}`;
      transitions.set(key, (transitions.get(key) ?? 0) + 1);
      const rows = rowsByProposal.get(proposed) ?? [];
      rows.push({
        noteId: result.id,
        title: result.title,
        contentIndex: finding.contentIndex,
        text: finding.text,
        assigned: finding.assigned,
        proposed,
        margin: finding.margin,
        signals: strongestSignals(finding),
        order: stableHash(`${result.id}:${finding.contentIndex}`),
      });
      rowsByProposal.set(proposed, rows);
    }
  }

  const queues = [...rowsByProposal.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, rows]) => rows.sort((a, b) => a.order - b.order));
  const sample: ShadowSampleRow[] = [];
  while (
    sample.length < sampleSize &&
    queues.some((queue) => queue.length > 0)
  ) {
    for (const queue of queues) {
      const row = queue.shift();
      if (!row || sample.length >= sampleSize) continue;
      const { order: _order, ...rest } = row;
      sample.push(rest);
    }
  }

  const checked = results.filter((result) => result.drift !== null);
  const drifted = checked.filter(
    (result) =>
      (result.drift?.missing.length ?? 0) +
        (result.drift?.unexpected.length ?? 0) >
      0
  );
  return {
    classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
    source,
    notes: results.length,
    failedNotes,
    blocks: results.reduce((sum, result) => sum + result.blocks, 0),
    notesWithFindings: results.filter((result) => result.findings.length > 0)
      .length,
    findings: results.reduce((sum, result) => sum + result.findings.length, 0),
    transitions: [...transitions.entries()]
      .map(([key, count]) => {
        const [assigned = "", proposed = ""] = key.split("\u0000");
        return { assigned, proposed, count };
      })
      .sort(
        (a, b) => b.count - a.count || a.proposed.localeCompare(b.proposed)
      ),
    notesCheckedAgainstStored: checked.length,
    notesWithDrift: drifted.length,
    driftExamples: drifted.slice(0, driftExampleLimit).map((result) => ({
      noteId: result.id,
      title: result.title,
      drift: result.drift ?? { missing: [], unexpected: [] },
    })),
    sample,
  };
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function share(part: number, whole: number): string {
  return whole === 0 ? "n/a" : `${((part / whole) * 100).toFixed(1)}%`;
}

/**
 * Markdown for a shadow run: totals, proposals by kind, the stored-row check, and the review sample with an empty column for the reviewer's verdict.
 */
export function buildShadowReport(summary: ShadowSummary): string {
  const lines = [
    "# Recipe structure shadow run",
    "",
    `Classifier ${summary.classifierVersion}, source: ${summary.source}. Generated by \`yarn workspace @peas/queue structure:shadow\`; nothing was written to the database.`,
    "",
    "| Notes | Failed to read | Blocks | Notes with findings | Findings | Findings per 1,000 blocks |",
    "| --- | --- | --- | --- | --- | --- |",
    `| ${summary.notes} | ${summary.failedNotes} | ${summary.blocks} | ${summary.notesWithFindings} (${share(summary.notesWithFindings, summary.notes)}) | ${summary.findings} | ${summary.blocks === 0 ? "n/a" : ((summary.findings / summary.blocks) * 1000).toFixed(1)} |`,
    "",
    "## Proposals",
    "",
  ];
  if (summary.transitions.length === 0) lines.push("None.");
  else
    lines.push(
      "| Importer filed as | Proposed | Count |",
      "| --- | --- | --- |",
      ...summary.transitions.map(
        (row) => `| ${row.assigned} | ${row.proposed} | ${row.count} |`
      )
    );

  lines.push("", "## Stored lines", "");
  if (summary.notesCheckedAgainstStored === 0)
    lines.push("Not checked (the source has no stored lines).");
  else {
    lines.push(
      `${summary.notesWithDrift} of ${summary.notesCheckedAgainstStored} notes have stored ingredient or instruction lines that differ from the filing rebuilt from their content (lines edited or removed after import, or imported by older rules). Provenance rebuilt from \`Note.html\` is exact for the rest.`
    );
    for (const example of summary.driftExamples) {
      lines.push(
        "",
        `- ${cell(example.title ?? "Untitled")} (\`${example.noteId}\`): ${example.drift.missing.length} rebuilt lines not stored, ${example.drift.unexpected.length} stored lines not rebuilt`
      );
      for (const key of example.drift.missing.slice(0, 3))
        lines.push(`  - rebuilt only: ${cell(key)}`);
      for (const key of example.drift.unexpected.slice(0, 3))
        lines.push(`  - stored only: ${cell(key)}`);
    }
  }

  lines.push(
    "",
    `## Review sample (${summary.sample.length})`,
    "",
    "Fill in the Correct column (y or n) for each row; precision per proposal kind is the share of y. Only kinds at 98% or better may later be applied automatically."
  );
  if (summary.sample.length === 0) lines.push("", "No findings to review.");
  else
    lines.push(
      "",
      "| Correct | Note | Line | Text | Importer | Proposed | Margin | Strongest signals |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      ...summary.sample.map(
        (row) =>
          `|  | ${cell(row.title ?? "Untitled")} | ${row.contentIndex} | ${cell(row.text)} | ${row.assigned} | ${row.proposed} | ${row.margin} | ${cell(row.signals)} |`
      )
    );
  return `${lines.join("\n")}\n`;
}

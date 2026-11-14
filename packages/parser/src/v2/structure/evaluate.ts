import type { BlockFeatureOptions } from "./features.js";
import { segmentContent } from "./segment-content.js";
import { BLOCK_KINDS, type BlockKind } from "./types.js";
import { type BlockClassification, validateStructure } from "./validate.js";
import { STRUCTURE_CLASSIFIER_VERSION } from "./version.js";

const LABEL_CODES: Record<string, BlockKind> = {
  I: "INGREDIENT",
  S: "INSTRUCTION",
  H: "SECTION_HEADING",
  N: "NOTE",
  O: "OTHER",
};

/**
 * One fixture note: content lines written as `<code> | <text>`, where the code is I (ingredient), S (step), H (heading), N (note), or O (other), or two codes joined by "+" for a heading glued to the rest of the line ("H+S | For the sauce: Combine…"). Blank strings are blank lines.
 *
 * @example
 * { id: "sauce-heading", lines: ["H | For the sauce:", "I | 2 tbsp butter", "", "S | Melt the butter in a pan."] }
 */
export interface StructureFixtureNote {
  id: string;
  description?: string;
  lines: string[];
  /** The expectation is right but the classifier cannot meet it yet. */
  knownFailures?: number[];
}

export interface LabelledContent {
  id: string;
  lines: string[];
  /** Expected label by content index. */
  expected: Map<number, string>;
  knownFailures: Set<number>;
}

/**
 * Splits fixture lines into the content the importer would see and the expected labels.
 *
 * @example
 * parseFixtureNote({ id: "x", lines: ["H | For the sauce:", "I | 2 tbsp butter"] })
 * // { lines: ["For the sauce:", "2 tbsp butter"], expected: Map { 0 => "SECTION_HEADING", 1 => "INGREDIENT" }, ... }
 */
export function parseFixtureNote(note: StructureFixtureNote): LabelledContent {
  const expected = new Map<number, string>();
  const lines = note.lines.map((line, index) => {
    if (line.trim() === "") return "";
    const separator = line.indexOf(" | ");
    if (separator === -1)
      throw new Error(`${note.id} line ${index}: expected "<code> | <text>"`);
    const kinds = line
      .slice(0, separator)
      .trim()
      .split("+")
      .map((code) => {
        const kind = LABEL_CODES[code];
        if (!kind)
          throw new Error(`${note.id} line ${index}: unknown code ${code}`);
        return kind;
      });
    expected.set(index, kinds.join("+"));
    return line.slice(separator + 3);
  });
  return {
    id: note.id,
    lines,
    expected,
    knownFailures: new Set(note.knownFailures ?? []),
  };
}

export interface BlockOutcome {
  noteId: string;
  block: BlockClassification;
  expected: string;
  knownFailure: boolean;
}

export interface LabelMetrics {
  label: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number | null;
  recall: number | null;
}

/**
 * How the validator did on labelled notes. `importerAccuracy` is the share of blocks the DOM rules already got right; `validatorAccuracy` the share right after applying every finding. A false positive is a finding on a block the importer had right.
 */
export interface StructureEvaluation {
  classifierVersion: string;
  noteCount: number;
  blockCount: number;
  importerAccuracy: number;
  validatorAccuracy: number;
  labels: LabelMetrics[];
  findings: {
    total: number;
    correct: number;
    falsePositives: number;
    wrongProposal: number;
    /** Blocks the importer misfiled that got no finding. */
    missed: number;
  };
  outcomes: BlockOutcome[];
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

/**
 * Runs segmentation and validation on each labelled note and scores the result.
 *
 * @example
 * const evaluation = evaluateStructure(fixture.notes.map(parseFixtureNote));
 * evaluation.findings // { total: 9, correct: 9, falsePositives: 0, wrongProposal: 0, missed: 1 }
 */
export function evaluateStructure(
  notes: readonly LabelledContent[],
  options: BlockFeatureOptions = {}
): StructureEvaluation {
  const outcomes: BlockOutcome[] = [];
  for (const note of notes) {
    const blocks = segmentContent(note.lines);
    const validation = validateStructure(blocks, options);
    for (const block of validation.blocks) {
      const expected = note.expected.get(block.contentIndex);
      if (expected === undefined)
        throw new Error(
          `${note.id}: content line ${block.contentIndex} ("${block.text}") has no label`
        );
      outcomes.push({
        noteId: note.id,
        block,
        expected,
        knownFailure: note.knownFailures.has(block.contentIndex),
      });
    }
  }

  const labelSet = new Set<string>([
    ...BLOCK_KINDS,
    ...outcomes.flatMap((outcome) => [outcome.expected, outcome.block.label]),
  ]);
  const labels = [...labelSet]
    .map((label): LabelMetrics => {
      const truePositives = outcomes.filter(
        (o) => o.block.label === label && o.expected === label
      ).length;
      const falsePositives = outcomes.filter(
        (o) => o.block.label === label && o.expected !== label
      ).length;
      const falseNegatives = outcomes.filter(
        (o) => o.block.label !== label && o.expected === label
      ).length;
      return {
        label,
        truePositives,
        falsePositives,
        falseNegatives,
        precision: ratio(truePositives, truePositives + falsePositives),
        recall: ratio(truePositives, truePositives + falseNegatives),
      };
    })
    .filter(
      (metrics) =>
        metrics.truePositives +
          metrics.falsePositives +
          metrics.falseNegatives >
        0
    );

  const withFinding = outcomes.filter((o) => o.block.finding !== null);
  const misfiled = outcomes.filter((o) => o.block.assigned !== o.expected);
  return {
    classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
    noteCount: notes.length,
    blockCount: outcomes.length,
    importerAccuracy:
      ratio(outcomes.length - misfiled.length, outcomes.length) ?? 1,
    validatorAccuracy:
      ratio(
        outcomes.filter((o) => o.block.label === o.expected).length,
        outcomes.length
      ) ?? 1,
    labels,
    findings: {
      total: withFinding.length,
      correct: withFinding.filter((o) => o.block.label === o.expected).length,
      falsePositives: withFinding.filter((o) => o.block.assigned === o.expected)
        .length,
      wrongProposal: withFinding.filter(
        (o) => o.block.assigned !== o.expected && o.block.label !== o.expected
      ).length,
      missed: misfiled.filter((o) => o.block.finding === null).length,
    },
    outcomes,
  };
}

function percent(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function topSignals(block: BlockClassification): string {
  return [...block.signals]
    .filter((item) => item.id !== "IMPORTER_SECTION")
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 4)
    .map((item) => `${item.id}${item.text ? ` (${item.text})` : ""}`)
    .join(", ");
}

/**
 * Markdown report for one or more labelled sets: accuracy before and after validation, findings, per-label precision and recall, and every disagreement with its strongest signals.
 */
export function buildStructureReport(
  sets: { name: string; evaluation: StructureEvaluation }[]
): string {
  const lines = [
    "# Recipe structure validation",
    "",
    `Classifier ${STRUCTURE_CLASSIFIER_VERSION}. Generated by \`yarn workspace @peas/parser evaluate:structure\`; do not edit by hand.`,
    "",
    "Importer accuracy is the share of blocks the DOM rules already file correctly; validator accuracy is the share correct after applying every finding. A false positive is a finding on a block the importer had right.",
    "",
    "| Set | Notes | Blocks | Importer accuracy | Validator accuracy | Findings | Correct | False positives | Wrong proposal | Missed |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...sets.map(
      ({ name, evaluation: e }) =>
        `| ${name} | ${e.noteCount} | ${e.blockCount} | ${percent(e.importerAccuracy)} | ${percent(e.validatorAccuracy)} | ${e.findings.total} | ${e.findings.correct} | ${e.findings.falsePositives} | ${e.findings.wrongProposal} | ${e.findings.missed} |`
    ),
  ];

  for (const { name, evaluation } of sets) {
    lines.push(
      "",
      `## ${name}`,
      "",
      "| Label | Precision | Recall | TP | FP | FN |",
      "| --- | --- | --- | --- | --- | --- |",
      ...evaluation.labels.map(
        (m) =>
          `| ${m.label} | ${percent(m.precision)} | ${percent(m.recall)} | ${m.truePositives} | ${m.falsePositives} | ${m.falseNegatives} |`
      )
    );
    const disagreements = evaluation.outcomes.filter(
      (o) => o.block.label !== o.expected
    );
    lines.push("", `### Disagreements (${disagreements.length})`, "");
    if (disagreements.length === 0) {
      lines.push("None.");
      continue;
    }
    lines.push(
      "| Note | Line | Text | Importer | Expected | Validator | Strongest signals |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      ...disagreements.map(
        (o) =>
          `| ${o.noteId}${o.knownFailure ? " (known)" : ""} | ${o.block.contentIndex} | ${cell(o.block.text)} | ${o.block.assigned} | ${o.expected} | ${o.block.label} | ${cell(topSignals(o.block))} |`
      )
    );
  }
  return `${lines.join("\n")}\n`;
}

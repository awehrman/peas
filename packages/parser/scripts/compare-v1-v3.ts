/**
 * Compares the v1 baseline (fixtures/baseline/v1.jsonl, from
 * `yarn corpus:baseline-v1`) with v3 over the corpus and the held-out golden
 * set, and writes fixtures/reports/v1-vs-v3.md.
 *
 * Usage: yarn report:compare
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type GoldenCase,
  type GoldenSegment,
  loadCorpus,
  loadGoldenCases,
  loadStructuralLexicon,
  toGolden,
} from "../src/v3/__tests__/helpers/golden.js";
import type { IngredientLineSyntax, Quantity } from "../src/v3/ast/types.js";
import { describeSyntax } from "../src/v3/debug/describe.js";
import { parseLineBest } from "../src/v3/parse-line.js";
import { formatRational, parseRational } from "../src/v3/quantity/rational.js";
import { PARSER_VERSION } from "../src/v3/version.js";

interface V1Row {
  text: string;
  rule?: string;
  segments?: { type: string; value: string }[];
  error?: string;
}

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = join(packageDir, "fixtures/reports/v1-vs-v3.md");

/** v1 canonical unit names mapped to v3 unit ids. */
const V1_UNIT_TO_V3: Record<string, string> = {
  c: "cup",
  lbs: "lb",
  "fl oz": "fl_oz",
  cloves: "clove",
  sprigs: "sprig",
  bunches: "bunch",
  cans: "can",
  slices: "slice",
  sticks: "stick",
  pinches: "pinch",
  dashes: "dash",
  handful: "handful",
};

function v1FirstQuantity(row: V1Row): { amount?: string; unit?: string } {
  const segments = row.segments ?? [];
  const amount = segments.find((segment) => segment.type === "amount")?.value;
  const unit = segments.find((segment) => segment.type === "unit")?.value;
  let normalizedAmount: string | undefined;
  if (amount) {
    try {
      normalizedAmount = formatRational(parseRational(amount));
    } catch {
      normalizedAmount = amount;
    }
  }
  const normalizedUnit = unit ? (V1_UNIT_TO_V3[unit] ?? unit.replace(/s$/, "")) : undefined;
  return { amount: normalizedAmount, unit: normalizedUnit };
}

function v3FirstQuantity(syntax: IngredientLineSyntax): { amount?: string; unit?: string } {
  const quantity = syntax.segments[0]?.quantity;
  if (!quantity) return {};
  function simple(q: Quantity): { amount?: string; unit?: string } {
    switch (q.kind) {
      case "EXACT":
        return { amount: q.implied ? undefined : formatRational(q.value), unit: q.unit?.id };
      case "RANGE":
        return { amount: formatRational(q.minimum), unit: q.unit?.id };
      case "APPROXIMATE":
        return simple(q.quantity);
      case "PACKAGE":
        return { amount: formatRational(q.count), unit: q.packageType?.id };
      case "ALTERNATIVE":
        return q.options[0] ? simple(q.options[0]) : {};
      case "SUM":
        return q.parts[0] ? simple(q.parts[0]) : {};
      case "UNSPECIFIED":
        return {};
    }
  }
  return simple(quantity);
}

function percent(count: number, total: number): string {
  return total === 0 ? "n/a" : `${((count / total) * 100).toFixed(1)}%`;
}

function fieldAccuracy(cases: GoldenCase[], field: keyof GoldenSegment | "status", lexicon = loadStructuralLexicon()) {
  let correct = 0;
  for (const goldenCase of cases) {
    const actual = toGolden(parseLineBest(goldenCase.input, { lexicon }));
    if (field === "status") {
      if (actual.status === goldenCase.expected.status) correct += 1;
      continue;
    }
    const expectedValues = goldenCase.expected.segments.map((segment) => JSON.stringify(segment[field] ?? null));
    const actualValues = actual.segments.map((segment) => JSON.stringify(segment[field] ?? null));
    if (JSON.stringify(expectedValues) === JSON.stringify(actualValues)) correct += 1;
  }
  return `${correct}/${cases.length} (${percent(correct, cases.length)})`;
}

function main(): void {
  const corpus = loadCorpus();
  const baseline = new Map(
    readFileSync(join(packageDir, "fixtures/baseline/v1.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as V1Row)
      .map((row) => [row.text, row])
  );

  const started = performance.now();
  const v3Results = new Map(corpus.map((row) => [row.text, parseLineBest(row.text)]));
  const v3Milliseconds = performance.now() - started;

  const v3Statuses = { PARSED: 0, PARTIAL: 0, FAILED: 0 };
  let v1Errors = 0;
  let comparable = 0;
  let amountAgreement = 0;
  let unitAgreement = 0;
  const disagreements: string[] = [];

  for (const row of corpus) {
    const v3 = v3Results.get(row.text);
    const v1 = baseline.get(row.text);
    if (!v3) continue;
    v3Statuses[v3.status] += 1;
    if (!v1 || v1.error) {
      v1Errors += 1;
      continue;
    }

    comparable += 1;
    const v1Quantity = v1FirstQuantity(v1);
    const v3Quantity = v3FirstQuantity(v3);
    const amountMatches = v1Quantity.amount === v3Quantity.amount;
    const unitMatches = v1Quantity.unit === v3Quantity.unit;
    if (amountMatches) amountAgreement += 1;
    if (unitMatches) unitAgreement += 1;
    if (!amountMatches || !unitMatches) {
      const v1Summary = (v1.segments ?? []).map((s) => `${s.type}:${s.value}`).join(" | ");
      disagreements.push(
        `| ${row.distinctNotes} | \`${row.text.replace(/\|/g, "\\|")}\` | ${v1Summary.replace(/\|/g, "/")} | ${describeSyntax(v3).replace(/\|/g, "/")} |`
      );
    }
  }

  const holdout = loadGoldenCases("structural.holdout");
  const dev = loadGoldenCases("structural.dev");

  const report = `# v1 vs v3 structural comparison

Generated by \`yarn workspace @peas/parser report:compare\` with v3 parser ${PARSER_VERSION}.
The v1 baseline is a reference, not ground truth.

## Corpus (${corpus.length} distinct lines)

| Metric | v1 | v3 |
|---|---|---|
| Parse errors | ${v1Errors} | ${v3Statuses.FAILED} |
| Partial parses | n/a | ${v3Statuses.PARTIAL} |
| Full parses | ${corpus.length - v1Errors} | ${v3Statuses.PARSED} |
| Time for the corpus | ~70 ms per line (measured in the v1 snapshot test) | ${v3Milliseconds.toFixed(0)} ms total |

Agreement on the first quantity (${comparable} lines both parsed):

- Amount: ${amountAgreement}/${comparable} (${percent(amountAgreement, comparable)})
- Unit: ${unitAgreement}/${comparable} (${percent(unitAgreement, comparable)})

Most disagreements are intended: v3 keeps food parts ("garlic cloves") in the
phrase, reads parenthetical sizes as package sizes, and treats "pinch of" as an
implied amount, where v1 flattened these into loose segments.

## Golden sets (structural lexicon)

| Field | Dev (${dev.length}, ${dev.filter((c) => c.knownFailure).length} known failures) | Held out (${holdout.length}) |
|---|---|---|
| Status | ${fieldAccuracy(dev, "status")} | ${fieldAccuracy(holdout, "status")} |
| Quantity | ${fieldAccuracy(dev, "quantity")} | ${fieldAccuracy(holdout, "quantity")} |
| Measurement modifiers | ${fieldAccuracy(dev, "measurementModifiers")} | ${fieldAccuracy(holdout, "measurementModifiers")} |
| Phrase | ${fieldAccuracy(dev, "phrase")} | ${fieldAccuracy(holdout, "phrase")} |
| Parentheticals | ${fieldAccuracy(dev, "parentheticals")} | ${fieldAccuracy(holdout, "parentheticals")} |
| Trailing | ${fieldAccuracy(dev, "trailing")} | ${fieldAccuracy(holdout, "trailing")} |

The held-out expectations were drafted from v3 output and then reviewed by
hand, so they overstate accuracy until new lines are added without that step.

## Known failures (dev set)

${dev
  .filter((c) => c.knownFailure)
  .map((c) => `- \`${c.input}\`: ${c.note}`)
  .join("\n")}

## First-quantity disagreements (top 50 by distinct notes)

| Notes | Line | v1 | v3 |
|---|---|---|---|
${disagreements.slice(0, 50).join("\n")}
`;

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report);
  console.log(`Wrote ${reportPath}`);
}

main();

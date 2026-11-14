/**
 * Structure validation report (Phase 8.5): how often the importer's DOM rules misfile a line in the labelled fixtures, and what the validator proposes. Each set runs on structure alone and again with the semantic fixture lexicon, so known foods can count as evidence. Writes fixtures/reports/structure.md.
 *
 * Usage: yarn evaluate:structure [--out path]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  ResolverSnapshotSchema,
  buildResolverContext,
} from "../src/v2/resolve/context.js";
import {
  type StructureFixtureNote,
  buildStructureReport,
  evaluateStructure,
  parseFixtureNote,
} from "../src/v2/structure/index.js";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const { values } = parseArgs({
  options: {
    out: {
      type: "string",
      default: join(packageDir, "fixtures/reports/structure.md"),
    },
  },
});

function loadNotes(name: string) {
  const fixture = JSON.parse(
    readFileSync(join(packageDir, `fixtures/structure/${name}.json`), "utf8")
  ) as { notes: StructureFixtureNote[] };
  return fixture.notes.map(parseFixtureNote);
}

const { lexicon } = buildResolverContext(
  ResolverSnapshotSchema.parse(
    JSON.parse(
      readFileSync(join(packageDir, "fixtures/lexicon/snapshot.json"), "utf8")
    )
  )
);

const dev = loadNotes("notes.dev");
const holdout = loadNotes("notes.holdout");
const sets = [
  { name: "dev", evaluation: evaluateStructure(dev) },
  { name: "holdout", evaluation: evaluateStructure(holdout) },
  {
    name: "dev, with food lexicon",
    evaluation: evaluateStructure(dev, { lexicon }),
  },
  {
    name: "holdout, with food lexicon",
    evaluation: evaluateStructure(holdout, { lexicon }),
  },
];

mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, buildStructureReport(sets));
for (const { name, evaluation } of sets) {
  console.log(
    `${name}: ${evaluation.blockCount} blocks, ${evaluation.findings.total} findings (${evaluation.findings.correct} correct, ${evaluation.findings.falsePositives} false positives, ${evaluation.findings.missed} missed)`
  );
}
console.log(`Wrote ${relative(process.cwd(), values.out)}`);

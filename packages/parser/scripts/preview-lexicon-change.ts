/**
 * Shows how a lexicon change would reinterpret the corpus before it is made.
 *
 * Usage:
 *   yarn preview:lexicon --add "whole milk:FOOD" [--add "packed:MEASUREMENT_MODIFIER"]
 *                        [--remove <entryId>] [--lexicon fixtures/lexicon/structural.json]
 *                        [--limit 20]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { loadCorpus } from "../src/v3/__tests__/helpers/golden.js";
import { LEXICON_ROLES, type LexiconRole } from "../src/v3/ast/types.js";
import { buildLexicon } from "../src/v3/lexicon/token-trie.js";
import type { LexiconEntryInput, LexiconSnapshot } from "../src/v3/lexicon/types.js";
import { parseLineBest } from "../src/v3/parse-line.js";
import { diffSyntax } from "../src/v3/preview/diff.js";

function parseAddition(value: string, index: number): LexiconEntryInput {
  const separator = value.lastIndexOf(":");
  const text = value.slice(0, separator).trim();
  const role = value.slice(separator + 1).trim().toUpperCase();
  if (separator <= 0 || !text || !(LEXICON_ROLES as readonly string[]).includes(role)) {
    throw new Error(`--add expects "text:ROLE" with ROLE in ${LEXICON_ROLES.join(", ")}; got "${value}"`);
  }
  return { id: `preview-${index}`, text, role: role as LexiconRole };
}

function main(): void {
  const { values } = parseArgs({
    options: {
      lexicon: { type: "string", default: "fixtures/lexicon/structural.json" },
      add: { type: "string", multiple: true, default: [] },
      remove: { type: "string", multiple: true, default: [] },
      limit: { type: "string", default: "20" },
    },
  });

  const base = JSON.parse(readFileSync(resolve(values.lexicon), "utf8")) as LexiconSnapshot;
  const additions = values.add.map(parseAddition);
  if (additions.length === 0 && values.remove.length === 0) {
    throw new Error("Nothing to preview: pass --add and/or --remove");
  }

  const before = buildLexicon(base);
  const after = buildLexicon({
    revision: (base.revision ?? 0) + 1,
    entries: [...base.entries.filter((entry) => !values.remove.includes(entry.id)), ...additions],
  });

  const corpus = loadCorpus();
  const changed = corpus
    .map((row) => ({
      row,
      diff: diffSyntax(parseLineBest(row.text, { lexicon: before }), parseLineBest(row.text, { lexicon: after })),
    }))
    .filter(({ diff }) => diff.changed)
    .sort((a, b) => b.row.distinctNotes - a.row.distinctNotes);

  const affectedNotes = changed.reduce((total, { row }) => total + row.distinctNotes, 0);
  console.log(
    `Change: ${[...additions.map((a) => `+ ${a.text} (${a.role})`), ...values.remove.map((id) => `- ${id}`)].join(", ")}`
  );
  console.log(
    `${changed.length} of ${corpus.length} distinct lines would change (appearing in ${affectedNotes} note occurrences).\n`
  );

  for (const { row, diff } of changed.slice(0, Number(values.limit))) {
    console.log(`  ${row.text}`);
    console.log(`    before: ${diff.before}`);
    console.log(`    after:  ${diff.after}`);
  }
}

main();

/**
 * Explains how the v2 parser reads one ingredient line, step by step:
 * normalization, tokens, lexicon matches, and the resulting syntax tree.
 *
 *   yarn explain:line "2 heaping cups all-purpose flour, sifted"
 *   yarn explain:line --lexicon demo "3 garlic cloves, finely minced"
 *   yarn explain:line --lexicon demo --exploratory "1 tbsp extra-virgin olive oil"
 *   yarn explain:line --json "1 (14-ounce) can diced tomatoes"
 *
 * --lexicon accepts none (default), structural, or demo (fixtures/lexicon/*.json).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ParseMode, PhraseItem, Quantity } from "../src/v2/ast/types.js";
import { describePhrase, describeQuantity, describeSyntax } from "../src/v2/debug/describe.js";
import { buildLexicon, type Lexicon } from "../src/v2/lexicon/token-trie.js";
import type { LexiconSnapshot } from "../src/v2/lexicon/types.js";
import { normalizeText } from "../src/v2/normalize/normalize-text.js";
import { tokenize } from "../src/v2/normalize/tokenize.js";
import { parseLine } from "../src/v2/parse-line.js";

const LEXICON_NAMES = ["none", "structural", "demo"] as const;
type LexiconName = (typeof LEXICON_NAMES)[number];

interface CliOptions {
  line: string;
  lexiconName: LexiconName;
  mode: ParseMode;
  json: boolean;
}

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): CliOptions {
  let lexiconName: LexiconName = "none";
  let mode: ParseMode = "CONSERVATIVE";
  let json = false;
  const words: string[] = [];

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--lexicon") {
      const value = argv[++index];
      const match = LEXICON_NAMES.find((name) => name === value);
      if (!match) throw new Error(`--lexicon must be one of ${LEXICON_NAMES.join(", ")}`);
      lexiconName = match;
    } else if (arg === "--exploratory") {
      mode = "EXPLORATORY";
    } else if (arg === "--json") {
      json = true;
    } else if (arg !== undefined) {
      words.push(arg);
    }
  }

  const line = words.join(" ").trim();
  if (!line) throw new Error('Usage: yarn explain:line [--lexicon demo] [--exploratory] [--json] "<line>"');
  return { line, lexiconName, mode, json };
}

function loadLexicon(name: LexiconName): Lexicon | undefined {
  if (name === "none") return undefined;
  const path = join(packageDir, "fixtures/lexicon", `${name}.json`);
  return buildLexicon(JSON.parse(readFileSync(path, "utf8")) as LexiconSnapshot);
}

function describeQuantityKind(quantity: Quantity): string {
  return `${quantity.kind} ${describeQuantity(quantity)}  ("${quantity.span.text}")`;
}

function describeItems(items: PhraseItem[]): string {
  return items.length ? describePhrase(items) : "(none)";
}

function main(): void {
  const { line, lexiconName, mode, json } = parseArgs(process.argv.slice(2));
  const lexicon = loadLexicon(lexiconName);
  const normalized = normalizeText(line);
  const tokens = tokenize(normalized.text);
  const matches = lexicon ? lexicon.match(tokens, mode) : [];
  const trees = parseLine(line, { lexicon, mode });

  if (json) {
    console.log(JSON.stringify(trees, null, 2));
    return;
  }

  const rows: [string, string][] = [
    ["Raw", JSON.stringify(normalized.raw)],
    ["Normalized", JSON.stringify(normalized.text)],
    ["Tokens", tokens.map((token) => token.text).join(" | ")],
    ["Lexicon", `${lexiconName} (${mode})`],
  ];
  for (const [label, value] of rows) console.log(`${label.padEnd(12)}${value}`);

  for (const match of matches) {
    const text = normalized.text.slice(match.start, match.end);
    console.log(`${"".padEnd(12)}"${text}" -> ${match.roles.join("/")} (${match.entryIds.join(", ")})`);
  }

  trees.forEach((tree) => {
    console.log(`\nSegmentation ${tree.segmentationIndex}: ${tree.status}`);
    console.log(`  Summary   ${describeSyntax(tree)}`);
    for (const segment of tree.segments) {
      console.log(`  Segment ${segment.index}  "${segment.span.text}"`);
      if (segment.quantity) console.log(`    quantity     ${describeQuantityKind(segment.quantity)}`);
      if (segment.measurementModifiers.length) {
        console.log(`    modifiers    ${describeItems(segment.measurementModifiers)}`);
      }
      console.log(`    phrase       ${describeItems(segment.phrase)}`);
      for (const parenthetical of segment.parentheticals) {
        const quantity = parenthetical.quantity ? `${describeQuantityKind(parenthetical.quantity)} ` : "";
        console.log(`    paren        ${quantity}${describeItems(parenthetical.phrase)}`);
      }
      if (segment.trailing) console.log(`    trailing     ${describeItems(segment.trailing.phrase)}`);
      if (segment.coordination) {
        console.log(`    coordination "${segment.coordination.conjunction.text}" (unconfirmed until the resolver decides)`);
      }
    }
    if (tree.unparsed.length) {
      console.log(`  Unparsed  ${tree.unparsed.map((span) => JSON.stringify(span.text)).join(", ")}`);
    }
  });
}

main();

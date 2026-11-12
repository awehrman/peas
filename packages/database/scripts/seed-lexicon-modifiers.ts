#!/usr/bin/env tsx
/**
 * Loads the reviewed modifier seed (packages/parser/fixtures/lexicon/modifiers.seed.json) as ACTIVE lexicon entries. Safe to run repeatedly. Run `db:seed:ontology` first.
 *
 * Usage:
 *   yarn workspace @peas/database db:seed:modifiers [path/to/seed.json]
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "../src/client.js";
import {
  type ModifierSeedEntry,
  seedLexiconModifiers,
} from "../src/seed/lexicon-modifiers.js";

const defaultPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../parser/fixtures/lexicon/modifiers.seed.json"
);
const seedPath = process.argv[2] ? resolve(process.argv[2]) : defaultPath;
const seed = JSON.parse(readFileSync(seedPath, "utf8")) as {
  entries: ModifierSeedEntry[];
};

seedLexiconModifiers(seed.entries)
  .then((summary) => {
    console.log(
      `Modifiers: ${summary.created} created, ${summary.existing} already present` +
        (summary.revision === null
          ? " (revision unchanged)"
          : ` at revision ${summary.revision}`)
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

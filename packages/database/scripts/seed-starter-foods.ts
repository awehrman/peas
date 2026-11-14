#!/usr/bin/env tsx
/**
 * Loads the starter foods (packages/parser/fixtures/lexicon/starter-foods.seed.json): chicken and its parts, dairy, pantry staples, produce, and oils, with names, hierarchy, and attribute applicability. Safe to run repeatedly. Run `db:seed:ontology` first.
 *
 * Usage:
 *   yarn workspace @peas/database db:seed:foods [path/to/seed.json]
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "../src/client.js";
import {
  type StarterFoodsSeed,
  seedStarterFoods,
} from "../src/seed/starter-foods.js";

const defaultPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../parser/fixtures/lexicon/starter-foods.seed.json"
);
const seedPath = process.argv[2] ? resolve(process.argv[2]) : defaultPath;
const seed = JSON.parse(readFileSync(seedPath, "utf8")) as StarterFoodsSeed;

seedStarterFoods(seed)
  .then((summary) => {
    console.log(
      `Starter foods: ${summary.conceptsCreated} concepts, ${summary.entriesCreated} names, ${summary.relationshipsCreated} relationships, ${summary.attributesAdded} concept attributes, ${summary.applicabilityAdded} applicability rows, ${summary.propertiesAdded} properties added` +
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

#!/usr/bin/env tsx
/**
 * Seeds the ontology from legacy Ingredient rows (Phase 3f). Resumable and idempotent. Run `db:seed:ontology` and `db:seed:modifiers` first so pass 2 can recognize modifiers.
 *
 * Usage:
 *   yarn workspace @peas/database db:seed:legacy [--batch 200] [--dry-run]
 */
import { parseArgs } from "node:util";

import { prisma } from "../src/client.js";
import { seedOntologyFromLegacy } from "../src/seed/ontology-from-legacy.js";

const { values } = parseArgs({
  options: {
    batch: { type: "string", default: "200" },
    "dry-run": { type: "boolean", default: false },
  },
});

const batchSize = Number.parseInt(values.batch, 10);
if (!Number.isInteger(batchSize) || batchSize < 1)
  throw new Error("--batch must be a positive integer");

seedOntologyFromLegacy({
  batchSize,
  dryRun: values["dry-run"],
  log: (message) => console.log(message),
})
  .then((summary) => {
    console.log(
      summary.dryRun ? "Dry run (nothing written):" : "Legacy seed complete:"
    );
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

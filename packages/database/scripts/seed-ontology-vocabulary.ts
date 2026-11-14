#!/usr/bin/env tsx
/**
 * Seeds attribute dimensions, attribute values, and preparation operations. Safe to run repeatedly.
 *
 * Usage:
 *   yarn workspace @peas/database db:seed:ontology
 */
import { prisma } from "../src/client.js";
import { seedOntologyVocabulary } from "../src/seed/ontology-vocabulary.js";

seedOntologyVocabulary()
  .then((summary) => {
    console.log(
      `Seeded ${summary.definitionsAdded} attribute dimensions, ${summary.valuesAdded} values, ${summary.preparationsAdded} preparations` +
        (summary.revision === null
          ? " (nothing new; revision unchanged)"
          : ` at revision ${summary.revision}`)
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

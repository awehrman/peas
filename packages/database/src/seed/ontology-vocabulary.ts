/**
 * Seeds the ontology vocabulary from @peas/parser/v2 (ontology/vocabulary.ts): attribute dimensions with their values, and preparation operations. Idempotent: rows are matched by key, labels are updated in place, and the lexicon revision is bumped once ("seed:vocabulary") only when something was added.
 *
 * @example
 * await seedOntologyVocabulary() // { definitionsAdded: 11, valuesAdded: 47, preparationsAdded: 27, revision: 1 }
 * await seedOntologyVocabulary() // { definitionsAdded: 0, valuesAdded: 0, preparationsAdded: 0, revision: null }
 */
import { ATTRIBUTE_DIMENSIONS, PREPARATION_OPERATIONS } from "@peas/parser/v2";

import { prisma } from "../client.js";
import { bumpRevision } from "../repository/ontology/revision.js";

export interface SeedSummary {
  definitionsAdded: number;
  valuesAdded: number;
  preparationsAdded: number;
  revision: number | null;
}

export async function seedOntologyVocabulary(): Promise<SeedSummary> {
  return prisma.$transaction(async (tx) => {
    const summary: SeedSummary = {
      definitionsAdded: 0,
      valuesAdded: 0,
      preparationsAdded: 0,
      revision: null,
    };

    for (const dimension of ATTRIBUTE_DIMENSIONS) {
      const existing = await tx.attributeDefinition.findUnique({
        where: { key: dimension.key },
        select: { id: true },
      });
      const definition = existing
        ? await tx.attributeDefinition.update({
            where: { key: dimension.key },
            data: { name: dimension.name },
            select: { id: true },
          })
        : await tx.attributeDefinition.create({
            data: { key: dimension.key, name: dimension.name },
            select: { id: true },
          });
      if (!existing) summary.definitionsAdded += 1;

      for (const value of dimension.values) {
        const where = {
          definitionId_key: { definitionId: definition.id, key: value.key },
        };
        const found = await tx.attributeValue.findUnique({
          where,
          select: { id: true },
        });
        if (found) {
          await tx.attributeValue.update({
            where,
            data: { label: value.label },
          });
        } else {
          await tx.attributeValue.create({
            data: {
              definitionId: definition.id,
              key: value.key,
              label: value.label,
            },
          });
          summary.valuesAdded += 1;
        }
      }
    }

    for (const operation of PREPARATION_OPERATIONS) {
      const found = await tx.preparationOperation.findUnique({
        where: { key: operation.key },
        select: { id: true },
      });
      if (found) {
        await tx.preparationOperation.update({
          where: { key: operation.key },
          data: { label: operation.label },
        });
      } else {
        await tx.preparationOperation.create({ data: operation });
        summary.preparationsAdded += 1;
      }
    }

    if (
      summary.definitionsAdded +
        summary.valuesAdded +
        summary.preparationsAdded >
      0
    ) {
      summary.revision = await bumpRevision(tx, "seed:vocabulary");
    }
    return summary;
  });
}

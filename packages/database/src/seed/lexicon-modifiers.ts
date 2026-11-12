import { entryMatchKey } from "@peas/parser/v2";

import { prisma } from "../client.js";
import {
  type LexiconTarget,
  OntologyError,
  computeTargetKey,
} from "../repository/ontology/helpers.js";
import {
  type LexiconEntryCreateInput,
  createLexiconEntries,
} from "../repository/ontology/lexicon.js";
import { bumpRevision } from "../repository/ontology/revision.js";

/**
 * One reviewed modifier from packages/parser/fixtures/lexicon/modifiers.seed.json. Targets are vocabulary keys, resolved to ids here.
 *
 * @example
 * { text: "finely", role: "DEGREE", valueKey: "fine" }
 * { text: "boneless", role: "ATTRIBUTE", attribute: "bone:boneless" }
 * { text: "chopped", role: "PREPARATION", preparation: "chop" }
 */
export interface ModifierSeedEntry {
  text: string;
  role:
    | "ATTRIBUTE"
    | "PREPARATION"
    | "DEGREE"
    | "MEASUREMENT_MODIFIER"
    | "INSTRUCTION";
  attribute?: string;
  preparation?: string;
  valueKey?: string;
}

export interface ModifierSeedSummary {
  created: number;
  existing: number;
  revision: number | null;
}

/**
 * Loads reviewed modifier entries as ACTIVE lexicon entries. Idempotent: entries that already exist are skipped, and the revision is bumped once ("seed:modifiers") only when something was added. Requires the vocabulary seed (`db:seed:ontology`) first.
 *
 * @example
 * await seedLexiconModifiers(seed.entries) // { created: 97, existing: 0, revision: 2 }
 */
export async function seedLexiconModifiers(
  entries: readonly ModifierSeedEntry[]
): Promise<ModifierSeedSummary> {
  return prisma.$transaction(async (tx) => {
    const definitions = await tx.attributeDefinition.findMany({
      include: { values: true },
    });
    const attributeIds = new Map<string, string>();
    for (const definition of definitions) {
      for (const value of definition.values)
        attributeIds.set(`${definition.key}:${value.key}`, value.id);
    }
    const preparationIds = new Map(
      (await tx.preparationOperation.findMany()).map((operation) => [
        operation.key,
        operation.id,
      ])
    );

    const inputs: LexiconEntryCreateInput[] = entries.map((entry) => {
      const target: LexiconTarget = { role: entry.role };
      if (entry.role === "ATTRIBUTE") {
        target.attributeValueId = attributeIds.get(entry.attribute ?? "");
        if (!target.attributeValueId)
          throw new OntologyError(
            `Unknown attribute "${entry.attribute}" for "${entry.text}"; run db:seed:ontology first`
          );
      } else if (entry.role === "PREPARATION") {
        target.preparationId = preparationIds.get(entry.preparation ?? "");
        if (!target.preparationId)
          throw new OntologyError(
            `Unknown preparation "${entry.preparation}" for "${entry.text}"; run db:seed:ontology first`
          );
      } else {
        target.valueKey = entry.valueKey;
      }
      return { ...target, text: entry.text, status: "ACTIVE" };
    });

    const existing = await tx.lexiconEntry.findMany({
      where: {
        OR: inputs.map((input) => ({
          matchKey: entryMatchKey(input.text),
          targetKey: computeTargetKey(input),
        })),
      },
      select: { matchKey: true, targetKey: true },
    });
    const existingKeys = new Set(
      existing.map((row) => `${row.matchKey}|${row.targetKey}`)
    );
    const missing = inputs.filter(
      (input) =>
        !existingKeys.has(
          `${entryMatchKey(input.text)}|${computeTargetKey(input)}`
        )
    );
    if (missing.length === 0)
      return { created: 0, existing: inputs.length, revision: null };

    const revision = await bumpRevision(tx, "seed:modifiers");
    const results = await createLexiconEntries(tx, missing, revision);
    const created = results.filter((result) => result.created).length;
    return { created, existing: inputs.length - created, revision };
  });
}

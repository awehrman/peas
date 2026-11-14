import type { DbClient } from "./helpers.js";

import type { LegacyMappingStatus } from "@prisma/client";

import { prisma } from "../../client.js";

export interface LegacyMappingRecord {
  legacyIngredientId: string;
  conceptId: string | null;
  status: LegacyMappingStatus;
  note: string | null;
  migratedAt: string | null;
}

/**
 * Records where a legacy Ingredient row went. `migratedAt` is stamped the first time the status becomes MAPPED.
 *
 * @example
 * await upsertLegacyMapping(tx, { legacyIngredientId: "clx...", conceptId: garlicId, status: "MAPPED" })
 * await upsertLegacyMapping(tx, { legacyIngredientId: "cly...", status: "NEEDS_REVIEW", note: "brand name, not a food" })
 */
export async function upsertLegacyMapping(
  tx: DbClient,
  input: {
    legacyIngredientId: string;
    conceptId?: string | null;
    status: LegacyMappingStatus;
    note?: string | null;
  }
): Promise<LegacyMappingRecord> {
  const previous = await tx.legacyIngredientMapping.findUnique({
    where: { legacyIngredientId: input.legacyIngredientId },
    select: { migratedAt: true },
  });
  const migratedAt =
    input.status === "MAPPED"
      ? (previous?.migratedAt ?? new Date())
      : (previous?.migratedAt ?? null);
  const data = {
    conceptId: input.conceptId ?? null,
    status: input.status,
    note: input.note ?? null,
    migratedAt,
  };

  const row = await tx.legacyIngredientMapping.upsert({
    where: { legacyIngredientId: input.legacyIngredientId },
    create: { legacyIngredientId: input.legacyIngredientId, ...data },
    update: data,
  });
  return { ...row, migratedAt: row.migratedAt?.toISOString() ?? null };
}

/**
 * @example
 * await getLegacyMapping("clx...") // { conceptId: "0193...", status: "MAPPED", ... } or null
 */
export async function getLegacyMapping(
  legacyIngredientId: string,
  db: DbClient = prisma
): Promise<LegacyMappingRecord | null> {
  const row = await db.legacyIngredientMapping.findUnique({
    where: { legacyIngredientId },
  });
  return row
    ? { ...row, migratedAt: row.migratedAt?.toISOString() ?? null }
    : null;
}

import type { DbClient } from "./helpers.js";

import { prisma } from "../../client.js";

/**
 * The latest lexicon revision, or 0 before anything has been recorded.
 *
 * @example
 * await getCurrentRevision() // 3
 */
export async function getCurrentRevision(
  db: DbClient = prisma
): Promise<number> {
  const latest = await db.lexiconRevision.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return latest?.id ?? 0;
}

/**
 * Records a new revision in the caller's transaction and returns its id. Every knowledge change bumps exactly once (decision D8); revisions are never updated.
 *
 * @example
 * await prisma.$transaction(async (tx) => {
 *   const revision = await bumpRevision(tx, "seed:vocabulary");
 *   await createLexiconEntries(tx, entries, revision);
 * });
 */
export async function bumpRevision(
  tx: DbClient,
  reason: string
): Promise<number> {
  const row = await tx.lexiconRevision.create({
    data: { reason },
    select: { id: true },
  });
  return row.id;
}

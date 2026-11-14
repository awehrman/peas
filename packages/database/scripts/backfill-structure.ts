#!/usr/bin/env tsx
/**
 * Structure review backfill (Phase 8.5-C): validates every unarchived note, records each stored line's position in the note content, and stores proposals for lines the validator thinks were misfiled. Idempotent and resumable: decided proposals are never touched, each batch logs `checkpoint=<noteId>` for `--after`, and a rerun after a classifier change refreshes open proposals and supersedes ones no longer raised.
 *
 * Usage:
 *   yarn workspace @peas/database db:backfill:structure [--after <noteId>] [--batch 200]
 */
import { parseArgs } from "node:util";

import { prisma } from "../src/client.js";
import { backfillStructure } from "../src/repository/structure.js";

const { values } = parseArgs({
  options: {
    after: { type: "string" },
    batch: { type: "string", default: "200" },
  },
});

const batchSize = Number.parseInt(values.batch, 10);
if (!Number.isInteger(batchSize) || batchSize < 1)
  throw new Error("--batch must be a positive integer");

try {
  const summary = await backfillStructure({
    after: values.after,
    batchSize,
    onBatch: ({ notes, findings, checkpoint }) =>
      console.log(
        `${notes} notes, ${findings} findings checkpoint=${checkpoint}`
      ),
  });
  console.log(
    `Done: ${summary.notes} notes, ${summary.findings} findings, ${summary.created} new proposals, ${summary.superseded} superseded.`
  );
} finally {
  await prisma.$disconnect();
}

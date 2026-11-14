/**
 * Writes v2 mentions and discoveries for every active ingredient line (Phase 4a). Idempotent and resumable: verified mentions are never touched, legacy tables are never written, and each batch logs `checkpoint=<lineId>` for `--after`. Finishes by mining adjacency into discoveries and printing coverage.
 *
 *   yarn workspace @peas/queue backfill:mentions [--after <parsedLineId>] [--batch 500] [--mode CONSERVATIVE]
 */
import "../src/config/load-env";

import { parseArgs } from "node:util";

import {
  backfillMentions,
  getCorpusCoverage,
  loadResolverSnapshot,
  prisma,
  refreshDiscoveries,
} from "@peas/database";
import { PARSE_MODES, type ParseMode, buildResolverContext } from "@peas/parser/v2";

const { values } = parseArgs({
  options: {
    after: { type: "string" },
    batch: { type: "string", default: "500" },
    mode: { type: "string", default: "CONSERVATIVE" },
  },
});

async function main(): Promise<void> {
  const batchSize = Number.parseInt(values.batch, 10);
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("--batch must be a positive integer");
  if (!PARSE_MODES.includes(values.mode as ParseMode)) throw new Error(`--mode must be one of ${PARSE_MODES.join(", ")}`);
  const mode = values.mode as ParseMode;

  const snapshot = await loadResolverSnapshot();
  const context = buildResolverContext(snapshot);
  console.log(`Backfilling at lexicon revision ${snapshot.revision} (${mode})${values.after ? ` after ${values.after}` : ""}`);

  const totals = await backfillMentions(context, {
    after: values.after ?? null,
    batchSize,
    mode,
    onBatch: ({ checkpoint, totals: progress }) => console.log(`checkpoint=${checkpoint} lines=${progress.lines}`),
  });
  const refreshed = await prisma.$transaction((tx) => refreshDiscoveries(tx, context), { timeout: 120_000 });
  const coverage = await getCorpusCoverage();

  console.log(JSON.stringify({ totals, refreshed, coverage }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

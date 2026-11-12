/**
 * Re-resolves lines whose mentions predate a lexicon revision (Phase 4e), for decisions that affected more lines than the review screen reinterprets in one request. Shares the backfill code path; with `--decision` it only touches lines the decision can affect.
 *
 *   yarn workspace @peas/queue reinterpret --revision <r> [--decision <decisionId>] [--batch 500]
 */
import "../src/config/load-env";

import { parseArgs } from "node:util";

import {
  backfillMentions,
  getCorpusCoverage,
  loadResolverSnapshot,
  prisma,
} from "@peas/database";
import { DecisionPayloadSchema, buildResolverContext, decisionScope } from "@peas/parser/v2";

const { values } = parseArgs({
  options: {
    revision: { type: "string" },
    decision: { type: "string" },
    batch: { type: "string", default: "500" },
  },
});

async function main(): Promise<void> {
  const revision = Number.parseInt(values.revision ?? "", 10);
  if (!Number.isInteger(revision) || revision < 1) throw new Error("--revision must be a positive integer");
  const batchSize = Number.parseInt(values.batch, 10);
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("--batch must be a positive integer");

  let prefilter: { phrases: string[]; conceptIds: string[] } | undefined;
  if (values.decision) {
    const decision = await prisma.lexiconDecision.findUnique({ where: { id: values.decision }, select: { payload: true } });
    if (!decision) throw new Error(`Decision ${values.decision} does not exist`);
    const scope = decisionScope(DecisionPayloadSchema.parse(decision.payload));
    prefilter = { phrases: scope.phrases, conceptIds: scope.conceptIds };
  }

  const snapshot = await loadResolverSnapshot();
  console.log(`Reinterpreting lines older than revision ${revision} at revision ${snapshot.revision}`);
  const totals = await backfillMentions(buildResolverContext(snapshot), {
    batchSize,
    belowRevision: revision,
    prefilter,
    onBatch: ({ checkpoint, totals: progress }) => console.log(`checkpoint=${checkpoint} lines=${progress.lines}`),
  });
  console.log(JSON.stringify({ totals, coverage: await getCorpusCoverage() }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

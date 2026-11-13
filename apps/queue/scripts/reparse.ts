/**
 * Starts a REPARSE_BY_VERSION run (Phase 6c, step 6) after a grammar change ships: every active line written by another parser version, or never parsed, is reparsed in the background by the reinterpret worker. Runs are keyed by version ("reparse-2.1.0"), so running this twice starts one run. Admins can also use "Reparse" on /teach/health.
 *
 *   yarn workspace @peas/queue reparse [--version 2.1.0]
 */
import "../src/config/load-env";

import { parseArgs } from "node:util";

import { prisma, requestReinterpretRun } from "@peas/database";
import { PARSER_VERSION } from "@peas/parser/v2";

import { createQueue } from "../src/queues/create-queue";
import { QueueName } from "../src/types";
import type { ReinterpretJobData } from "../src/workers/reinterpret/dependencies";

const { values } = parseArgs({
  options: { version: { type: "string", default: PARSER_VERSION } },
});

async function main(): Promise<void> {
  const parserVersion = values.version;
  if (!/^\d+\.\d+\.\d+$/.test(parserVersion)) throw new Error("--version must look like 2.1.0");
  const run = await requestReinterpretRun({ kind: "REPARSE_BY_VERSION", parserVersion });
  if (run.status !== "PENDING") {
    console.log(`${run.jobId} is already ${run.status.toLowerCase()} (${run.processedLines}/${run.totalLines} lines)`);
    return;
  }
  const queue = createQueue(QueueName.REINTERPRET);
  const data: ReinterpretJobData = { jobId: run.jobId, runJobId: run.jobId, kind: "REPARSE_BY_VERSION", parserVersion };
  await queue.add("reinterpret-run", data, {
    jobId: run.jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
  await queue.close();
  console.log(`Queued ${run.jobId}; the reinterpret worker picks it up and reports progress through Query.job.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

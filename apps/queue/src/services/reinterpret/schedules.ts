import type { Queue } from "bullmq";

import type { StructuredLogger } from "../../types";
import type { ReinterpretJobData } from "../../workers/reinterpret/dependencies";

/**
 * Repeating maintenance on the reinterpret queue (Phase 6e and 6f): a daily corpus health snapshot and a weekly exploratory sweep. Times are server-local cron patterns.
 */
export const MAINTENANCE_SCHEDULES: readonly {
  id: string;
  pattern: string;
  name: string;
  data: ReinterpretJobData;
}[] = [
  {
    id: "corpus-health-daily",
    pattern: "0 3 * * *",
    name: "corpus-health-snapshot",
    data: {
      jobId: "corpus-health-daily",
      runJobId: "corpus-health-daily",
      kind: "CORPUS_HEALTH_SNAPSHOT",
      trigger: "SCHEDULED",
    },
  },
  {
    id: "exploratory-sweep-weekly",
    pattern: "0 4 * * 0",
    name: "exploratory-sweep",
    data: {
      jobId: "exploratory-sweep-weekly",
      runJobId: "exploratory-sweep-weekly",
      kind: "EXPLORATORY_SWEEP",
    },
  },
];

/**
 * Registers (or updates) the maintenance schedules. Safe to call on every start: schedulers are keyed by id.
 *
 * @example
 * await scheduleMaintenanceJobs(queues.reinterpretQueue, logger)
 */
export async function scheduleMaintenanceJobs(
  queue: Pick<Queue, "upsertJobScheduler">,
  logger: StructuredLogger
): Promise<void> {
  for (const schedule of MAINTENANCE_SCHEDULES) {
    await queue.upsertJobScheduler(
      schedule.id,
      { pattern: schedule.pattern },
      {
        name: schedule.name,
        data: schedule.data,
        opts: { removeOnComplete: 20, removeOnFail: 20 },
      }
    );
  }
  logger.log(
    `[MAINTENANCE] scheduled ${MAINTENANCE_SCHEDULES.map((schedule) => `${schedule.id} (${schedule.pattern})`).join(", ")}`
  );
}

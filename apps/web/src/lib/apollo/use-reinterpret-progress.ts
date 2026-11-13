import { useCacheCoordinator } from "./cache-coordinator-provider";

import { useEffect, useState } from "react";

import type { ReinterpretProgress } from "@peas/features";

/** Job ids the queue gives background runs: reinterpretation after a decision ("reinterpret-<revision>") and reparses after a grammar change ("reparse-<version>"). */
export const REINTERPRET_JOB_PREFIXES = ["reinterpret-", "reparse-"] as const;

/**
 * The latest status of the background run the cache coordinator is polling (started by `applyDecision` or `startReparse` through `effect.reprocessingJobId`), or null when none has been tracked in this session.
 *
 * @example
 * const progress = useReinterpretProgress(); // { jobId: "reinterpret-15", status: "PROCESSING", processedCount: 400, totalCount: 1200, errorMessage: null }
 */
export function useReinterpretProgress(): ReinterpretProgress | null {
  const coordinator = useCacheCoordinator();
  const [progress, setProgress] = useState<ReinterpretProgress | null>(null);

  useEffect(
    () =>
      coordinator.onJobUpdate((update) => {
        if (
          REINTERPRET_JOB_PREFIXES.some((prefix) =>
            update.jobId.startsWith(prefix)
          )
        )
          setProgress(update);
      }),
    [coordinator]
  );

  return progress;
}

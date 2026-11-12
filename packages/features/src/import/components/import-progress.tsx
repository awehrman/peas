"use client";

import { ImportOverview } from "./import-overview";

import { useMemo, useState } from "react";

import { useActivity } from "../context/activity";
import { useStats } from "../context/stats";
import { useImportUpload } from "../context/upload";
import { useThrottledValue } from "../hooks/use-throttled-value";
import type { ImportStatsState } from "../types/import-types";
import { createImportRowBuilder, summarizeSteps } from "../utils/import-rows";

/** Queue events land every frame during a big import; the overview redraws a few times a second instead */
const OVERVIEW_REFRESH_MS = 250;

interface ImportProgressProps {
  /** Library totals from the app's data cache; falls back to the import stats context */
  library?: ImportStatsState;
}

/** Connects the import overview to upload, queue and library state. */
export function ImportProgress({ library }: ImportProgressProps) {
  const { state: liveUploads } = useImportUpload();
  const { state: liveActivity } = useActivity();
  const { state: contextLibrary } = useStats();

  const uploads = useThrottledValue(liveUploads, OVERVIEW_REFRESH_MS);
  const activity = useThrottledValue(liveActivity, OVERVIEW_REFRESH_MS);
  const [buildRows] = useState(createImportRowBuilder);

  const rows = useMemo(() => buildRows(uploads, activity), [buildRows, uploads, activity]);
  const steps = useMemo(
    () =>
      summarizeSteps(activity, rows.filter((row) => row.status !== "uploadFailed").length),
    [activity, rows]
  );

  return <ImportOverview rows={rows} steps={steps} library={library ?? contextLibrary} />;
}

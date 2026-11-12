"use client";

import { ImportOverview } from "./import-overview";

import { useMemo } from "react";

import { useActivity } from "../context/activity";
import { useStats } from "../context/stats";
import { useImportUpload } from "../context/upload";
import { buildImportRows, summarizeSteps } from "../utils/import-rows";

/** Connects the import overview to upload, queue and library state. */
export function ImportProgress() {
  const { state: uploads } = useImportUpload();
  const { state: activity } = useActivity();
  const { state: library } = useStats();

  const rows = useMemo(() => buildImportRows(uploads, activity), [uploads, activity]);
  const steps = useMemo(() => summarizeSteps(activity), [activity]);

  return <ImportOverview rows={rows} steps={steps} library={library} />;
}

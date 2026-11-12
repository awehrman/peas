import {
  IMPORT_STEP_ORDER,
  type ImportStepKey,
  calculateCardProgress,
  getStepLabel,
  isStepInProgress,
} from "./activity-helpers";

import type {
  ActivityState,
  ImportCard,
  UploadBatch,
  UploadState,
} from "../types/import-types";

export type ImportRowStatus =
  | "uploading"
  | "uploadFailed"
  | "queued"
  | "importing"
  | "needsAttention"
  | "imported";

export type ImportRowStepState = "done" | "active" | "error" | "pending";

export interface ImportRowStep {
  key: ImportStepKey;
  label: string;
  state: ImportRowStepState;
}

/** One note in the import, merged from its upload and its queue events. */
export interface ImportRow {
  id: string;
  title: string;
  status: ImportRowStatus;
  progress: number;
  /** What is happening to the note right now, e.g. "Parsing ingredients · 12 of 20" */
  activity: string;
  errorMessage?: string;
  thumbnailUrl?: string;
  source?: string;
  noteId?: string;
  steps: ImportRowStep[];
}

export interface ImportSummary {
  total: number;
  counts: Record<ImportRowStatus, number>;
  /** Average progress across notes that are still expected to finish */
  overallProgress: number;
}

export interface ImportStepSummary {
  key: ImportStepKey;
  label: string;
  completed: number;
  total: number;
}

/** Lower sorts first: problems, then active work, then waiting, then done. */
const STATUS_ORDER: Record<ImportRowStatus, number> = {
  needsAttention: 0,
  uploadFailed: 0,
  importing: 1,
  uploading: 2,
  queued: 3,
  imported: 4,
};

const STEP_SUMMARY_LABELS: Record<ImportStepKey, string> = {
  uploaded: "Uploaded",
  cleanedNote: "HTML cleaned",
  savedNote: "Notes saved",
  ingredientProcessing: "Ingredients parsed",
  instructionProcessing: "Instructions formatted",
  connectingSource: "Sources connected",
  addingImages: "Images processed",
  addingTags: "Tags added",
  addingCategories: "Categories added",
  checkDuplicates: "Duplicate check",
};

/**
 * Merges upload batches and queue cards (both keyed by importId) into one
 * row per note, ordered so problems and active notes come first.
 */
export function buildImportRows(
  uploads: UploadState,
  activity: ActivityState
): ImportRow[] {
  const batches = uploads.currentBatch
    ? [...uploads.previousBatches, uploads.currentBatch]
    : uploads.previousBatches;
  const batchesById = new Map(batches.map((batch) => [batch.importId, batch]));
  const orderedIds = [
    ...new Set([...batches.map((batch) => batch.importId), ...activity.cardIds]),
  ];

  const rows = orderedIds.map((id) =>
    buildRow(
      id,
      batchesById.get(id),
      activity.cardsById[id],
      id === uploads.currentBatch?.importId
    )
  );

  return rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.row.status] - STATUS_ORDER[b.row.status] ||
        a.index - b.index
    )
    .map(({ row }) => row);
}

export function summarizeImportRows(rows: ImportRow[]): ImportSummary {
  const counts: Record<ImportRowStatus, number> = {
    uploading: 0,
    uploadFailed: 0,
    queued: 0,
    importing: 0,
    needsAttention: 0,
    imported: 0,
  };
  let progressTotal = 0;

  for (const row of rows) {
    counts[row.status] += 1;
    if (row.status !== "uploadFailed") progressTotal += row.progress;
  }

  const expected = rows.length - counts.uploadFailed;
  return {
    total: rows.length,
    counts,
    overallProgress: expected > 0 ? Math.round(progressTotal / expected) : 0,
  };
}

/** How many notes have finished each pipeline step after the upload. */
export function summarizeSteps(activity: ActivityState): ImportStepSummary[] {
  const cards = activity.cardIds
    .map((id) => activity.cardsById[id])
    .filter((card): card is ImportCard => card !== undefined);

  return IMPORT_STEP_ORDER.filter((key) => key !== "uploaded").map((key) => ({
    key,
    label: STEP_SUMMARY_LABELS[key],
    completed: cards.filter(
      (card) => card.isComplete || card.status[key].completed
    ).length,
    total: cards.length,
  }));
}

/** Hostname for URLs ("seriouseats.com"), otherwise the text as written. */
export function formatSource(source: string): { label: string; href?: string } {
  try {
    const url = new URL(source);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { label: url.hostname.replace(/^www\./, ""), href: url.href };
    }
  } catch {
    // Not a URL, e.g. a cookbook reference
  }
  return { label: source };
}

function buildRow(
  id: string,
  batch: UploadBatch | undefined,
  card: ImportCard | undefined,
  isUploading: boolean
): ImportRow {
  const title = card?.title ?? batch?.directoryName ?? "Untitled note";
  const base = {
    id,
    title,
    thumbnailUrl: card?.thumbnailUrl,
    source: card?.source,
    noteId: card?.noteId,
  };

  if (batch?.errorMessage) {
    return {
      ...base,
      status: "uploadFailed",
      progress: 0,
      activity: "Upload failed",
      errorMessage: batch.errorMessage,
      steps: buildSteps(undefined, "error"),
    };
  }

  if (!card) {
    return {
      ...base,
      status: isUploading ? "uploading" : "queued",
      progress: 0,
      activity: isUploading
        ? `Uploading ${batch?.numberOfFiles ?? 1} ${batch?.numberOfFiles === 1 ? "file" : "files"}`
        : "Waiting in the queue",
      steps: buildSteps(undefined, isUploading ? "active" : "done"),
    };
  }

  const steps = buildSteps(card, "done");

  if (card.isComplete) {
    return { ...base, status: "imported", progress: 100, activity: "Imported", steps };
  }

  const failedStep = IMPORT_STEP_ORDER.find((key) => card.status[key].hasError);
  if (failedStep) {
    return {
      ...base,
      status: "needsAttention",
      progress: calculateCardProgress(card),
      activity: `${getStepLabel(failedStep)} failed`,
      errorMessage: card.status[failedStep].errorMessage,
      steps,
    };
  }

  return {
    ...base,
    status: "importing",
    progress: calculateCardProgress(card),
    activity: describeCurrentStep(card),
    steps,
  };
}

function buildSteps(
  card: ImportCard | undefined,
  uploadState: ImportRowStepState
): ImportRowStep[] {
  return IMPORT_STEP_ORDER.map((key) => ({
    key,
    label: getStepLabel(key),
    state: card ? getStepState(card, key) : key === "uploaded" ? uploadState : "pending",
  }));
}

function getStepState(card: ImportCard, key: ImportStepKey): ImportRowStepState {
  const status = card.status[key];
  if (status.hasError) return "error";
  if (card.isComplete || status.completed) return "done";
  if (status.started) return "active";
  return "pending";
}

function describeCurrentStep(card: ImportCard): string {
  const current =
    IMPORT_STEP_ORDER.find((key) => isStepInProgress(card.status[key])) ??
    IMPORT_STEP_ORDER.find((key) => !card.status[key].completed);
  if (!current) return "Finishing up";

  const { processedSteps, steps } = card.status[current];
  const counts =
    steps && processedSteps !== undefined ? ` · ${processedSteps} of ${steps}` : "";
  return `${getStepLabel(current)}${counts}`;
}

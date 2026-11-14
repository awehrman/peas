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
  | "notUploaded"
  | "uploading"
  | "uploadFailed"
  | "queued"
  | "importing"
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
  /** A step reported an error; stays set so problems don't flicker away */
  hasIssues: boolean;
  /** 0-100, only ever increases */
  progress: number;
  /** What is happening to the note right now, e.g. "Parsing ingredients · 12 of 20" */
  activity: string;
  errorMessage?: string;
  thumbnailUrl?: string;
  source?: string;
  noteId?: string;
  steps: ImportRowStep[];
}

/**
 * Totals for the import. `total`, `uploaded`, `started`, `imported` and
 * `needsAttention` only grow while an import runs, so they make calm
 * headline numbers; per-status counts like `importing` go up and down.
 */
export interface ImportSummary {
  total: number;
  counts: Record<ImportRowStatus, number>;
  /** Uploaded successfully, whatever happened next */
  uploaded: number;
  /** Notes the queue has picked up */
  started: number;
  imported: number;
  needsAttention: number;
  /** Combined progress out of every note expected to finish */
  overallProgress: number;
}

export interface ImportStepSummary {
  key: ImportStepKey;
  label: string;
  completed: number;
  total: number;
}

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

interface RowInputs {
  batch: UploadBatch | undefined;
  card: ImportCard | undefined;
  isUploading: boolean;
  isPending: boolean;
}

type ImportRowBuilder = (uploads: UploadState, activity: ActivityState) => ImportRow[];

/**
 * Merges upload batches and queue cards (both keyed by importId) into one
 * row per note, in upload order so rows never move while they update.
 */
export function buildImportRows(
  uploads: UploadState,
  activity: ActivityState
): ImportRow[] {
  return createImportRowBuilder()(uploads, activity);
}

/**
 * Like buildImportRows, but remembers each note's inputs and returns the
 * same row object while they are unchanged. The reducers keep untouched
 * batches and cards identical, so a frame of queue events rebuilds only the
 * handful of notes it touched and memoized rows skip rendering.
 */
export function createImportRowBuilder(): ImportRowBuilder {
  let cache = new Map<string, RowInputs & { row: ImportRow }>();

  return (uploads, activity) => {
    const batches = [
      ...uploads.previousBatches,
      ...(uploads.currentBatch ? [uploads.currentBatch] : []),
      ...uploads.pendingBatches,
    ];
    const batchesById = new Map(batches.map((batch) => [batch.importId, batch]));
    const pendingIds = new Set(uploads.pendingBatches.map((batch) => batch.importId));
    const orderedIds = [
      ...new Set([...batches.map((batch) => batch.importId), ...activity.cardIds]),
    ];
    const nextCache = new Map<string, RowInputs & { row: ImportRow }>();

    const rows = orderedIds.map((id) => {
      const inputs: RowInputs = {
        batch: batchesById.get(id),
        card: activity.cardsById[id],
        isUploading: id === uploads.currentBatch?.importId,
        isPending: pendingIds.has(id),
      };
      const cached = cache.get(id);
      const row =
        cached &&
        cached.batch === inputs.batch &&
        cached.card === inputs.card &&
        cached.isUploading === inputs.isUploading &&
        cached.isPending === inputs.isPending
          ? cached.row
          : buildRow(id, inputs);
      nextCache.set(id, { ...inputs, row });
      return row;
    });

    cache = nextCache;
    return rows;
  };
}

export function summarizeImportRows(rows: ImportRow[]): ImportSummary {
  const counts: Record<ImportRowStatus, number> = {
    notUploaded: 0,
    uploading: 0,
    uploadFailed: 0,
    queued: 0,
    importing: 0,
    imported: 0,
  };
  let progressTotal = 0;
  let withIssues = 0;

  for (const row of rows) {
    counts[row.status] += 1;
    progressTotal += row.progress;
    if (row.hasIssues) withIssues += 1;
  }

  const expected = rows.length - counts.uploadFailed;
  return {
    total: rows.length,
    counts,
    uploaded: counts.queued + counts.importing + counts.imported,
    started: counts.importing + counts.imported,
    imported: counts.imported,
    needsAttention: counts.uploadFailed + withIssues,
    overallProgress: expected > 0 ? Math.floor(progressTotal / expected) : 0,
  };
}

/**
 * How many notes have finished each pipeline step after the upload, out of
 * every note expected to finish, so the bars only grow.
 */
export function summarizeSteps(
  activity: ActivityState,
  expectedTotal: number
): ImportStepSummary[] {
  const cards = activity.cardIds
    .map((id) => activity.cardsById[id])
    .filter((card): card is ImportCard => card !== undefined);
  const total = Math.max(expectedTotal, cards.length);

  return IMPORT_STEP_ORDER.filter((key) => key !== "uploaded").map((key) => ({
    key,
    label: STEP_SUMMARY_LABELS[key],
    completed: cards.filter(
      (card) => card.isComplete || card.status[key].completed
    ).length,
    total,
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

function buildRow(id: string, { batch, card, isUploading, isPending }: RowInputs): ImportRow {
  const base = {
    id,
    title: card?.title ?? batch?.directoryName ?? "Untitled note",
    thumbnailUrl: card?.thumbnailUrl,
    source: card?.source,
    noteId: card?.noteId,
  };

  if (batch?.errorMessage) {
    return {
      ...base,
      status: "uploadFailed",
      hasIssues: false,
      progress: 0,
      activity: "Upload failed",
      errorMessage: batch.errorMessage,
      steps: buildSteps(undefined, "error"),
    };
  }

  if (!card) {
    const fileCount = batch?.numberOfFiles ?? 1;
    return {
      ...base,
      status: isUploading ? "uploading" : isPending ? "notUploaded" : "queued",
      hasIssues: false,
      progress: 0,
      activity: isUploading
        ? `Uploading ${fileCount} ${fileCount === 1 ? "file" : "files"}`
        : isPending
          ? "Waiting to upload"
          : "Waiting in the queue",
      steps: buildSteps(undefined, isUploading ? "active" : isPending ? "pending" : "done"),
    };
  }

  const failedStep = IMPORT_STEP_ORDER.find((key) => card.status[key].hasError);
  return {
    ...base,
    status: card.isComplete ? "imported" : "importing",
    hasIssues: failedStep !== undefined,
    progress: calculateCardProgress(card),
    activity: card.isComplete
      ? failedStep
        ? `Imported · ${getStepLabel(failedStep).toLowerCase()} had errors`
        : "Imported"
      : describeCurrentStep(card),
    errorMessage: failedStep ? card.status[failedStep].errorMessage : undefined,
    steps: buildSteps(card, "done"),
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

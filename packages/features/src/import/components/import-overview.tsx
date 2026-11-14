"use client";

import { ImportNoteList } from "./import-note-list";

import type { ReactNode } from "react";

import { Progress } from "@peas/components";

import {
  StackedBar,
  StatCard,
  StatTile,
  formatCount,
  formatPercent,
} from "../../dashboard/components/stat-charts";
import type { ImportStatsState } from "../types/import-types";
import {
  type ImportRow,
  type ImportStepSummary,
  type ImportSummary,
  summarizeImportRows,
} from "../utils/import-rows";

export interface ImportOverviewProps {
  rows: ImportRow[];
  steps: ImportStepSummary[];
  /** Totals for the whole library, refreshed as notes finish */
  library: ImportStatsState;
}

/**
 * Dashboard-style report on the notes being imported in this session.
 * Headline numbers and bar edges are measured against the full selection,
 * so they only move forward while notes upload and import concurrently.
 */
export function ImportOverview({ rows, steps, library }: ImportOverviewProps): ReactNode {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-greyscale-200 px-4 py-10 text-center text-sm text-muted-foreground">
        {library.numberOfNotes > 0
          ? `You have ${formatCount(library.numberOfNotes)} ${pluralize(library.numberOfNotes, "note", "notes")} so far. `
          : ""}
        Import more notes.
      </p>
    );
  }

  const summary = summarizeImportRows(rows);

  return (
    <div className="flex flex-col gap-6">
      <OverviewTiles summary={summary} library={library} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ImportStatusCard summary={summary} />
        <PipelineCard steps={steps} />
      </div>

      <ImportNoteList rows={rows} summary={summary} />
    </div>
  );
}

function OverviewTiles({
  summary,
  library,
}: {
  summary: ImportSummary;
  library: ImportStatsState;
}): ReactNode {
  const { counts, total } = summary;

  return (
    <section aria-label="Import overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Uploaded"
        value={summary.uploaded}
        detail={
          <div className="flex flex-col gap-1.5 pt-1">
            <Progress value={percent(summary.uploaded, total)} aria-label="Upload progress" />
            <span>
              of {formatCount(total)} {pluralize(total, "note", "notes")}
              {counts.uploadFailed > 0 ? ` · ${formatCount(counts.uploadFailed)} failed` : ""}
            </span>
          </div>
        }
      />
      <StatTile
        label="Imported"
        value={summary.imported}
        detail={
          <div className="flex flex-col gap-1.5 pt-1">
            <Progress value={summary.overallProgress} aria-label="Import progress" />
            <span>{summary.overallProgress}% of this import done</span>
          </div>
        }
      />
      <StatTile
        label="Needs a look"
        value={summary.needsAttention}
        detail={
          summary.needsAttention > 0
            ? "Use the “Needs a look” filter below"
            : "No problems so far"
        }
      />
      <StatTile
        label="Notes in your library"
        value={library.numberOfNotes}
        detail={`${formatCount(library.numberOfIngredients)} ingredients · ${formatCount(library.numberOfParsingErrors)} parsing ${pluralize(library.numberOfParsingErrors, "error", "errors")}`}
      />
    </section>
  );
}

function ImportStatusCard({ summary }: { summary: ImportSummary }): ReactNode {
  const { counts, total, imported, needsAttention } = summary;
  const isFinished = imported + counts.uploadFailed === total;
  const attention =
    needsAttention > 0
      ? `${formatCount(needsAttention)} ${needsAttention === 1 ? "needs" : "need"} a look`
      : "";

  const description = isFinished
    ? attention
      ? `Done · ${attention}`
      : "Every note imported cleanly"
    : `${formatCount(imported)} of ${formatCount(total)} imported (${formatPercent(imported, total)})${attention ? ` · ${attention}` : ""}`;

  // Ordered so each boundary (imported, picked up, uploaded) only moves right
  return (
    <StatCard title="Import status" description={description}>
      <StackedBar
        label="Notes by import status"
        segments={[
          { label: "Imported", count: imported, colorClassName: "bg-primary-500" },
          { label: "Importing", count: counts.importing, colorClassName: "bg-secondary-400" },
          { label: "In the queue", count: counts.queued, colorClassName: "bg-greyscale-400" },
          {
            label: "Not uploaded yet",
            count: counts.notUploaded + counts.uploading,
            colorClassName: "bg-greyscale-200",
          },
          { label: "Upload failed", count: counts.uploadFailed, colorClassName: "bg-error-500" },
        ]}
      />
    </StatCard>
  );
}

function PipelineCard({ steps }: { steps: ImportStepSummary[] }): ReactNode {
  const total = steps[0]?.total ?? 0;

  return (
    <StatCard
      title="Pipeline"
      description={`Notes through each step, out of ${formatCount(total)} in this import`}
    >
      <ol aria-label="Notes finished per step" className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{step.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCount(step.completed)} of {formatCount(step.total)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-greyscale-100" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary-400 transition-[width] duration-500 ease-out"
                style={{ width: `${percent(step.completed, step.total)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </StatCard>
  );
}

function percent(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

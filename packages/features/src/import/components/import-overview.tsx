"use client";

import { ImportNoteList } from "./import-note-list";

import type { ReactNode } from "react";

import { Progress } from "@peas/components";

import {
  StackedBar,
  StatCard,
  StatTile,
  formatCount,
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

/** Dashboard-style report on the notes being imported in this session. */
export function ImportOverview({ rows, steps, library }: ImportOverviewProps): ReactNode {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-greyscale-200 px-4 py-10 text-center text-sm text-muted-foreground">
        {library.numberOfNotes > 0
          ? `You have ${formatCount(library.numberOfNotes)} ${pluralize(library.numberOfNotes, "note", "notes")} so far. `
          : ""}
        Maybe add some more.
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
  const { counts } = summary;
  const inProgress = counts.uploading + counts.queued + counts.importing;

  return (
    <section aria-label="Import overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Notes in this import"
        value={summary.total}
        detail={
          counts.uploadFailed > 0
            ? `${formatCount(counts.uploadFailed)} failed to upload`
            : counts.uploading > 0
              ? "Uploading files…"
              : "Every file uploaded"
        }
      />
      <StatTile
        label="In progress"
        value={inProgress}
        detail={
          counts.queued > 0
            ? `${formatCount(counts.queued)} waiting in the queue`
            : inProgress > 0
              ? "Nothing waiting in the queue"
              : "Queue is clear"
        }
      />
      <StatTile
        label="Imported"
        value={counts.imported}
        detail={
          <div className="flex flex-col gap-1.5 pt-1">
            <Progress value={summary.overallProgress} aria-label="Import progress" />
            <span>{summary.overallProgress}% of this import done</span>
          </div>
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
  const { counts } = summary;
  const needsAttention = counts.needsAttention + counts.uploadFailed;
  const inProgress = counts.uploading + counts.queued + counts.importing;

  const description =
    needsAttention > 0
      ? `${formatCount(needsAttention)} ${needsAttention === 1 ? "note needs" : "notes need"} a look`
      : inProgress > 0
        ? `${formatCount(counts.imported)} of ${formatCount(summary.total)} notes imported so far`
        : "Every note imported cleanly";

  return (
    <StatCard title="Import status" description={description}>
      <StackedBar
        label="Notes by import status"
        segments={[
          { label: "Imported", count: counts.imported, colorClassName: "bg-primary-500" },
          { label: "Importing", count: counts.importing, colorClassName: "bg-secondary-400" },
          {
            label: "Waiting",
            count: counts.queued + counts.uploading,
            colorClassName: "bg-greyscale-300",
          },
          {
            label: "Needs a look",
            count: counts.needsAttention,
            colorClassName: "bg-warning-400",
          },
          {
            label: "Upload failed",
            count: counts.uploadFailed,
            colorClassName: "bg-error-500",
          },
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
      description={
        total > 0
          ? `How far ${formatCount(total)} ${pluralize(total, "note has", "notes have")} made it through each step`
          : "Steps will fill in once notes reach the queue"
      }
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
                className="h-full rounded-full bg-primary-400 transition-[width]"
                style={{ width: `${step.total > 0 ? (step.completed / step.total) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </StatCard>
  );
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

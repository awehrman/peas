"use client";

import { BarChart, DataTable, LineChart } from "./charts";
import type { HealthPhrase, HealthSnapshot, HealthTrends } from "./types";

import { type ReactNode, useState } from "react";

import { Button } from "@peas/components";

import { AppLink } from "../../app-navigation";
import {
  InlineError,
  type MutationAction,
  formatDate,
  useMutation,
} from "../../shared";

export type HealthAction = MutationAction<[], { message: string }>;

export interface HealthPageContentProps {
  trends: HealthTrends;
  onTakeSnapshot?: HealthAction;
  onStartReparse?: HealthAction;
  onRunSweep?: HealthAction;
}

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function share(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

function resolvedShare(snapshot: HealthSnapshot): number {
  return share(
    snapshot.totalMentions - snapshot.unresolvedMentions,
    snapshot.totalMentions
  );
}

/**
 * The Health tab (Phase 6e): coverage over time from stored snapshots, unresolved share by parser version (with the reparse control), review throughput and "taught to fixed" per week, and the top unknown and ambiguous phrases. Every chart has a data table beside it.
 *
 * @example
 * <HealthPageContent trends={data.corpusHealthTrends} onTakeSnapshot={take} onStartReparse={reparse} onRunSweep={sweep} />
 */
export function HealthPageContent({
  trends,
  onTakeSnapshot,
  onStartReparse,
  onRunSweep,
}: HealthPageContentProps): ReactNode {
  const staleVersions = trends.byParserVersion.filter(
    (row) => row.parserVersion !== trends.parserVersion && row.total > 0
  );
  const staleMentions = staleVersions.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">
          Corpus health
        </h1>
        <p className="text-sm text-greyscale-700">
          Running parser {trends.parserVersion}. Snapshots are taken daily and
          after every reinterpretation or reparse.
        </p>
      </header>

      <section
        aria-labelledby="maintenance-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="maintenance-heading"
          className="text-lg font-semibold text-greyscale-900"
        >
          Maintenance
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <MaintenanceAction
            label={`Reparse with ${trends.parserVersion}`}
            description={
              staleMentions > 0
                ? `${staleMentions.toLocaleString()} mentions were written by ${staleVersions.map((row) => row.parserVersion).join(", ")}.`
                : `Every mention was written by ${trends.parserVersion}.`
            }
            action={onStartReparse}
            isDisabled={staleMentions === 0}
          />
          <MaintenanceAction
            label="Run sweep"
            description="Re-read unresolved and needs-review mentions in exploratory mode for new discoveries."
            action={onRunSweep}
          />
          <MaintenanceAction
            label="Take snapshot"
            description="Store today's numbers now instead of waiting for the daily snapshot."
            action={onTakeSnapshot}
          />
        </div>
      </section>

      <CoverageSection snapshots={trends.snapshots} />

      <section
        aria-labelledby="versions-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="versions-heading"
          className="text-lg font-semibold text-greyscale-900"
        >
          Unresolved mentions by parser version
        </h2>
        {trends.byParserVersion.length === 0 ? (
          <p className="text-sm text-greyscale-600">No mentions yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <BarChart
              label={`Unresolved share by parser version: ${trends.byParserVersion
                .map(
                  (row) =>
                    `${row.parserVersion} ${percent(share(row.unresolved, row.total))}`
                )
                .join(", ")}`}
              labels={trends.byParserVersion.map((row) => row.parserVersion)}
              values={trends.byParserVersion.map((row) =>
                share(row.unresolved, row.total)
              )}
              max={1}
              className="fill-amber-500"
              formatValue={percent}
            />
            <DataTable
              caption="Mentions by parser version"
              columns={["Parser", "Mentions", "Unresolved", "Share"]}
              rows={trends.byParserVersion.map((row) => [
                row.parserVersion === trends.parserVersion
                  ? `${row.parserVersion} (running)`
                  : row.parserVersion,
                row.total.toLocaleString(),
                row.unresolved.toLocaleString(),
                percent(share(row.unresolved, row.total)),
              ])}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="review-heading" className="flex flex-col gap-3">
        <h2
          id="review-heading"
          className="text-lg font-semibold text-greyscale-900"
        >
          Review throughput
        </h2>
        {trends.reviewByWeek.length === 0 ? (
          <p className="text-sm text-greyscale-600">
            No decisions in the last 12 weeks.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <BarChart
              label={`Decisions per week: ${trends.reviewByWeek
                .map(
                  (week) =>
                    `week of ${shortDate.format(new Date(week.weekStart))} ${week.decisions}`
                )
                .join(", ")}`}
              labels={trends.reviewByWeek.map((week) =>
                shortDate.format(new Date(week.weekStart))
              )}
              values={trends.reviewByWeek.map((week) => week.decisions)}
              className="fill-secondary-500"
              formatValue={(value) => String(Math.round(value))}
            />
            <DataTable
              caption="Decisions and mentions changed per week"
              columns={[
                "Week of",
                "Decisions",
                "Mentions changed",
                "Per decision",
              ]}
              rows={trends.reviewByWeek.map((week) => [
                shortDate.format(new Date(week.weekStart)),
                week.decisions,
                week.mentionsChanged.toLocaleString(),
                week.decisions > 0
                  ? (week.mentionsChanged / week.decisions).toFixed(1)
                  : "0",
              ])}
            />
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <PhraseList
          id="unknown-heading"
          title="Top unknown phrases"
          phrases={trends.topUnknownPhrases}
          emptyText="No open unknown phrases."
        />
        <PhraseList
          id="ambiguous-heading"
          title="Most ambiguous phrases"
          phrases={trends.mostAmbiguousPhrases}
          emptyText="No open ambiguous phrases."
        />
      </div>
    </div>
  );
}

function CoverageSection({
  snapshots,
}: {
  snapshots: HealthSnapshot[];
}): ReactNode {
  const latest = snapshots.at(-1);
  return (
    <section aria-labelledby="coverage-heading" className="flex flex-col gap-3">
      <h2
        id="coverage-heading"
        className="text-lg font-semibold text-greyscale-900"
      >
        Coverage over time
      </h2>
      {latest ? (
        <div className="grid gap-4 md:grid-cols-2">
          <LineChart
            label={`Resolved share of mentions over ${snapshots.length} ${snapshots.length === 1 ? "snapshot" : "snapshots"}, latest ${percent(resolvedShare(latest))}; verified share latest ${percent(share(latest.verifiedMentions, latest.totalMentions))}`}
            labels={snapshots.map((snapshot) =>
              shortDate.format(new Date(snapshot.takenAt))
            )}
            series={[
              {
                name: "Resolved",
                className: "stroke-primary-600",
                values: snapshots.map(resolvedShare),
              },
              {
                name: "Verified",
                className: "stroke-secondary-600",
                values: snapshots.map((snapshot) =>
                  share(snapshot.verifiedMentions, snapshot.totalMentions)
                ),
              },
            ]}
            max={1}
            formatValue={percent}
          />
          <DataTable
            caption="Corpus health snapshots"
            columns={[
              "Taken",
              "Trigger",
              "Parser",
              "Mentions",
              "Resolved",
              "Verified",
              "Open discoveries",
            ]}
            rows={[...snapshots]
              .reverse()
              .map((snapshot) => [
                formatDate(snapshot.takenAt),
                snapshot.trigger.toLowerCase(),
                snapshot.parserVersion,
                snapshot.totalMentions.toLocaleString(),
                percent(resolvedShare(snapshot)),
                snapshot.verifiedMentions.toLocaleString(),
                snapshot.openDiscoveries,
              ])}
          />
        </div>
      ) : (
        <p className="text-sm text-greyscale-600">
          No snapshots yet. The first is taken overnight, or take one now.
        </p>
      )}
    </section>
  );
}

function MaintenanceAction({
  label,
  description,
  action,
  isDisabled = false,
}: {
  label: string;
  description: string;
  action?: HealthAction;
  isDisabled?: boolean;
}): ReactNode {
  const mutation = useMutation(action);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setMessage(null);
    const result = await mutation.run();
    if (result.success) setMessage(result.data?.message ?? "Done");
  }

  return (
    <div className="flex flex-1 flex-col gap-2 rounded-md border border-greyscale-200 p-3">
      <p className="text-sm text-greyscale-700">{description}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={!action || isDisabled || mutation.isPending}
        onClick={() => void run()}
      >
        {mutation.isPending ? "Working…" : label}
      </Button>
      <p role="status" className="text-xs text-success-800">
        {message}
      </p>
      <InlineError message={mutation.error} />
    </div>
  );
}

function PhraseList({
  id,
  title,
  phrases,
  emptyText,
}: {
  id: string;
  title: string;
  phrases: HealthPhrase[];
  emptyText: string;
}): ReactNode {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-lg font-semibold text-greyscale-900">
        {title}
      </h2>
      {phrases.length === 0 ? (
        <p className="text-sm text-greyscale-600">{emptyText}</p>
      ) : (
        <ol className="flex flex-col gap-1 text-sm">
          {phrases.map((phrase) => (
            <li key={phrase.discoveryId} className="flex justify-between gap-2">
              <AppLink
                href={`/teach/${phrase.discoveryId}`}
                className="text-primary underline underline-offset-2"
              >
                {phrase.phrase}
              </AppLink>
              <span className="tabular-nums text-greyscale-600">
                {phrase.mentionCount}{" "}
                {phrase.mentionCount === 1 ? "mention" : "mentions"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

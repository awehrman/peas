"use client";

import type { CorpusHealth } from "./types";

import type { ReactNode } from "react";

import { AppLink } from "../app-navigation";
import {
  StackedBar,
  StatCard,
  formatCount,
  formatPercent,
} from "../dashboard/components/stat-charts";

function Figure({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}): ReactNode {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-greyscale-600">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
      {detail ? (
        <dd className="text-xs text-greyscale-600">{detail}</dd>
      ) : null}
    </div>
  );
}

function share(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

/**
 * How well Peas understands the corpus (Phase 5g): lines with mentions, mentions by resolution status, open discoveries, the most frequent unknown phrases, the background reinterpretation backlog, and the queue's last hour of parses when the queue answers.
 *
 * @example
 * <CorpusHealthCard health={data.corpusHealth} />
 */
export function CorpusHealthCard({
  health,
}: {
  health: CorpusHealth;
}): ReactNode {
  const { mentions, live, reinterpretBacklog } = health;
  const backlog =
    reinterpretBacklog.pending + reinterpretBacklog.processing;

  return (
    <StatCard
      title="Corpus health"
      description={`Lexicon revision ${health.lexiconRevision}`}
    >
      <div className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure
            label="Lines with mentions"
            value={formatPercent(health.linesWithMentions, health.lineCount)}
            detail={`${formatCount(health.linesWithMentions)} of ${formatCount(health.lineCount)}`}
          />
          <Figure
            label="Resolved mentions"
            value={formatPercent(
              mentions.autoResolved + mentions.verified,
              mentions.total
            )}
            detail={`${formatCount(mentions.verified)} verified`}
          />
          <Figure
            label="Open discoveries"
            value={formatCount(health.openDiscoveryCount)}
          />
          <Figure
            label="Reinterpreting"
            value={formatCount(backlog)}
            detail={
              reinterpretBacklog.failed > 0
                ? `${formatCount(reinterpretBacklog.failed)} failed`
                : `${backlog === 1 ? "run" : "runs"} in progress`
            }
          />
        </dl>

        <StackedBar
          label="Mentions by resolution"
          segments={[
            {
              label: "Resolved",
              count: mentions.autoResolved,
              colorClassName: "bg-primary-500",
            },
            {
              label: "Verified",
              count: mentions.verified,
              colorClassName: "bg-secondary-400",
            },
            {
              label: "Needs review",
              count: mentions.needsReview,
              colorClassName: "bg-warning-400",
            },
            {
              label: "Unresolved",
              count: mentions.unresolved,
              colorClassName: "bg-error-500",
            },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="unknown-phrases-heading">
            <h3
              id="unknown-phrases-heading"
              className="mb-1 text-sm font-semibold"
            >
              Top unknown phrases
            </h3>
            {health.topUnknownPhrases.length === 0 ? (
              <p className="text-sm text-greyscale-600">
                No unknown phrases waiting.
              </p>
            ) : (
              <ol className="flex flex-col gap-0.5 text-sm">
                {health.topUnknownPhrases.map((row) => (
                  <li key={row.discoveryId} className="flex gap-2">
                    <AppLink
                      href={`/teach/${row.discoveryId}`}
                      className="truncate text-primary hover:underline"
                    >
                      {row.phrase}
                    </AppLink>
                    <span className="ml-auto tabular-nums text-greyscale-600">
                      {formatCount(row.mentionCount)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section aria-labelledby="live-parsing-heading">
            <h3
              id="live-parsing-heading"
              className="mb-1 text-sm font-semibold"
            >
              Last hour of imports
            </h3>
            {live ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-greyscale-600">Lines parsed</dt>
                <dd className="tabular-nums">
                  {formatCount(live.lineCount)} (
                  {live.linesPerSecond.toFixed(2)}/s)
                </dd>
                <dt className="text-greyscale-600">Structure parsed</dt>
                <dd className="tabular-nums">
                  {share(live.structuralSuccessShare)}
                </dd>
                <dt className="text-greyscale-600">Candidates per part</dt>
                <dd className="tabular-nums">
                  {live.averageCandidatesPerSegment === null
                    ? "—"
                    : live.averageCandidatesPerSegment.toFixed(1)}
                </dd>
                <dt className="text-greyscale-600">Unknown words</dt>
                <dd className="tabular-nums">
                  {formatCount(live.unknownTokens)}
                </dd>
              </dl>
            ) : (
              <p className="text-sm text-greyscale-600">
                The queue is not reachable, so live numbers are unavailable.
              </p>
            )}
          </section>
        </div>
      </div>
    </StatCard>
  );
}

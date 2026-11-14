"use client";

import { RankedList, StatCard, StatTile, formatCount } from "./stat-charts";

import type { ReactNode } from "react";

import { AppLink } from "../../app-navigation";
import { formatDate } from "../../shared";
import type { CorpusAnalytics } from "../types";

/**
 * What the collection says about its foods (Phase 8-D): settled mentions, foods with and without mentions, the most-used foods counting their kinds and parts (the direct count beside each), rare foods, and how foods are prepared and described. The most-used list by direct lines is the dashboard's "Most-used ingredients" card.
 *
 * @example
 * <CorpusAnalyticsSection analytics={data.corpusAnalytics} />
 */
export function CorpusAnalyticsSection({
  analytics,
}: {
  analytics: CorpusAnalytics;
}): ReactNode {
  return (
    <section aria-labelledby="corpus-analytics" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="corpus-analytics"
          className="text-lg font-semibold text-greyscale-900"
        >
          Foods in the collection
        </h2>
        <p className="text-xs text-muted-foreground">
          Updated {formatDate(analytics.computedAt)}
          {analytics.isStale ? "; refreshing in the background" : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Settled mentions"
          value={analytics.settledMentions}
          detail="Resolved or verified"
        />
        <StatTile
          label="Foods mentioned"
          value={analytics.conceptsWithMentions}
        />
        <StatTile
          label="Rare foods"
          value={analytics.rareConceptCount}
          detail="In one or two notes"
        />
        <StatTile
          label="Approved foods not yet seen"
          value={analytics.unusedVerifiedConcepts}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="With kinds and parts"
          description="Mentions of a food and its more specific foods"
        >
          <RankedList
            label="Most-used foods with kinds and parts"
            unit={["mention", "mentions"]}
            emptyLabel="No settled mentions yet."
            items={analytics.topExpanded.map((rank) => ({
              key: rank.concept.id,
              label: `${rank.concept.canonicalName} (${formatCount(rank.directMentions)} directly)`,
              count: rank.expandedMentions,
              href: `/concepts/${rank.concept.id}`,
            }))}
          />
        </StatCard>
        <StatCard
          title="Rare foods"
          description="Mentioned in one or two notes"
        >
          {analytics.rare.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rare foods yet.</p>
          ) : (
            <ul
              aria-label="Rare foods"
              className="flex flex-col gap-1.5 text-sm"
            >
              {analytics.rare.map((rank) => (
                <li
                  key={rank.concept.id}
                  className="flex items-baseline justify-between gap-3"
                >
                  <AppLink
                    href={`/concepts/${rank.concept.id}`}
                    className="truncate hover:underline"
                  >
                    {rank.concept.canonicalName}
                  </AppLink>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatCount(rank.directNotes)}{" "}
                    {rank.directNotes === 1 ? "note" : "notes"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </StatCard>
        <StatCard title="Preparations" description="How foods are prepared">
          <RankedList
            label="Preparations"
            unit={["mention", "mentions"]}
            emptyLabel="No preparations recorded yet."
            items={analytics.preparations.map((row) => ({
              key: row.preparationKey,
              label: `${row.label} (${formatCount(row.concepts)} ${row.concepts === 1 ? "food" : "foods"})`,
              count: row.mentions,
            }))}
          />
        </StatCard>
        <StatCard title="Descriptions" description="Attributes on mentions">
          <RankedList
            label="Descriptions"
            unit={["mention", "mentions"]}
            emptyLabel="No attributes recorded yet."
            items={analytics.attributes.map((row) => ({
              key: `${row.definitionKey}:${row.valueKey}`,
              label: `${row.definitionName}: ${row.label}`,
              count: row.mentions,
            }))}
          />
        </StatCard>
      </div>
    </section>
  );
}

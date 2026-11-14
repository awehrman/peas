"use client";

import {
  DISCOVERY_TYPE_LABELS,
  type DiscoveryType,
  type DiscoveryTypeCount,
  type TeachDiscovery,
} from "./types";

import type { ReactNode } from "react";

import { Badge, Button, cn } from "@peas/components";
import { FlaskConical, RefreshCw } from "lucide-react";

import { AppLink } from "../app-navigation";
import { InlineError, type MutationAction, useMutation } from "../shared";

export interface DiscoveryQueueProps {
  items: TeachDiscovery[];
  counts: DiscoveryTypeCount[];
  activeType: DiscoveryType | null;
  nextCursor: string | null;
  taughtMessage?: string | null;
  onRefresh?: MutationAction<[]>;
  /** Shown under the page header, e.g. the corpus health card. */
  summary?: ReactNode;
}

function queueHref(type: DiscoveryType | null, cursor?: string | null): string {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `/teach?${query}` : "/teach";
}

/**
 * The Teach Peas review queue: typed discoveries, highest priority first, filterable by type.
 */
export function DiscoveryQueuePageContent({
  items,
  counts,
  activeType,
  nextCursor,
  taughtMessage,
  onRefresh,
  summary,
}: DiscoveryQueueProps): ReactNode {
  const refresh = useMutation(onRefresh);
  const total = counts.reduce((sum, row) => sum + row.count, 0);
  const filters: {
    type: DiscoveryType | null;
    label: string;
    count: number;
  }[] = [
    { type: null, label: "All", count: total },
    ...counts
      .filter((row) => row.count > 0)
      .map((row) => ({
        type: row.type,
        label: DISCOVERY_TYPE_LABELS[row.type],
        count: row.count,
      })),
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-greyscale-900">
            Teach Peas
          </h1>
          <p className="text-sm text-greyscale-700">
            Each decision teaches Peas something it reuses on every recipe.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppLink
            href="/teach/playground"
            className="inline-flex items-center gap-1 rounded-md border border-greyscale-300 px-3 py-2 text-sm hover:bg-greyscale-50"
          >
            <FlaskConical className="h-4 w-4" aria-hidden="true" /> Playground
          </AppLink>
          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              disabled={refresh.isPending}
              onClick={() => void refresh.run()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />{" "}
              {refresh.isPending ? "Refreshing…" : "Refresh discoveries"}
            </Button>
          ) : null}
        </div>
      </header>
      <InlineError message={refresh.error} />
      {summary}

      {taughtMessage ? (
        <p
          role="status"
          className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-900"
        >
          {taughtMessage}
        </p>
      ) : null}

      <nav aria-label="Discovery type">
        <ul className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = filter.type === activeType;
            return (
              <li key={filter.type ?? "all"}>
                <AppLink
                  href={queueHref(filter.type)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-greyscale-300 hover:bg-greyscale-50"
                  )}
                >
                  {filter.label}
                  <span className="text-xs">{filter.count}</span>
                </AppLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="sr-only">
          Discoveries
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-greyscale-700">
            Nothing to review. Import notes and run the backfill to find more.
          </p>
        ) : (
          <ol className="flex flex-col divide-y divide-greyscale-200 rounded-lg border border-greyscale-200">
            {items.map((item) => (
              <li key={item.id}>
                <AppLink
                  href={`/teach/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-greyscale-50 focus-visible:bg-greyscale-50"
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-greyscale-900">
                      {item.title}
                    </span>
                    <span className="text-xs text-greyscale-700">
                      {DISCOVERY_TYPE_LABELS[item.type]} · {item.mentionCount}{" "}
                      {item.mentionCount === 1 ? "mention" : "mentions"} in{" "}
                      {item.distinctNoteCount}{" "}
                      {item.distinctNoteCount === 1 ? "note" : "notes"}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    aria-label={`Priority ${item.priority.toFixed(1)}`}
                  >
                    {item.priority.toFixed(1)}
                  </Badge>
                </AppLink>
              </li>
            ))}
          </ol>
        )}
        {nextCursor ? (
          <AppLink
            href={queueHref(activeType, nextCursor)}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Next page
          </AppLink>
        ) : null}
      </section>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

import { Badge, Button } from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink } from "../app-navigation";
import { formatCount } from "../dashboard/components/stat-charts";
import { HighlightedText, formatDate } from "../shared";

/**
 * A lexicon entry and when it was learned.
 *
 * @example
 * { id: "0193...", text: "chicken thighs", role: "FOOD", kind: "PLURAL", status: "ACTIVE", targetLabel: "chicken thigh", conceptId: "0193...", revisionAdded: 3, revisionRetired: null, createdAt: "2026-11-12T..." }
 */
export interface LexiconEntryDetailData {
  id: string;
  text: string;
  role: string;
  kind: string | null;
  status: string;
  targetLabel: string;
  conceptId: string | null;
  revisionAdded: number;
  revisionRetired: number | null;
  createdAt: string;
}

export interface LexiconOccurrenceRow {
  mentionId: string;
  lineText: string;
  span: { start: number; end: number; text: string } | null;
  noteId: string;
  noteTitle: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  conceptName: string | null;
  status: string;
}

export interface LexiconOccurrencesData {
  items: LexiconOccurrenceRow[];
  total: number;
  nextCursor: string | null;
}

const lower = (value: string) => value.replace(/_/g, " ").toLowerCase();

const STATUS_LABELS: Record<string, string> = {
  AUTO_RESOLVED: "resolved",
  VERIFIED: "verified",
  NEEDS_REVIEW: "waiting for review",
  UNRESOLVED: "unresolved",
};

/**
 * Where one lexicon entry is used (Phase 8-C): the entry, what it means, when it was added, and every line in active notes whose stored reading used it, with the matched words marked.
 *
 * @example
 * <LexiconEntryPageContent entry={entry} occurrences={occurrences} onLoadMore={loadMore} />
 */
export function LexiconEntryPageContent({
  entry,
  occurrences,
  onLoadMore,
  isLoadingMore = false,
}: {
  entry: LexiconEntryDetailData;
  occurrences: LexiconOccurrencesData;
  /** Fetches the next page; omit to hide "Load more". */
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}): ReactNode {
  return (
    <article className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href="/lexicon"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Lexicon
      </AppLink>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-greyscale-900">
          {entry.text}
        </h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-greyscale-700">
          <span>
            {lower(entry.role)}
            {entry.kind ? ` (${lower(entry.kind)})` : ""} meaning{" "}
            {entry.conceptId ? (
              <AppLink
                href={`/concepts/${entry.conceptId}`}
                className="text-primary underline underline-offset-2"
              >
                {entry.targetLabel}
              </AppLink>
            ) : (
              <span className="font-medium">{entry.targetLabel}</span>
            )}
          </span>
          {entry.status !== "ACTIVE" ? (
            <Badge variant="outline">
              {entry.status === "DEPRECATED" ? "retired" : lower(entry.status)}
            </Badge>
          ) : null}
        </p>
        <p className="text-xs text-greyscale-600">
          Added in revision {entry.revisionAdded} on{" "}
          {formatDate(entry.createdAt)}
          {entry.revisionRetired !== null
            ? `; retired in revision ${entry.revisionRetired}`
            : ""}
        </p>
      </header>

      <section
        aria-labelledby="entry-occurrences"
        className="flex flex-col gap-3"
      >
        <h2
          id="entry-occurrences"
          className="text-lg font-semibold text-greyscale-900"
        >
          Used in {formatCount(occurrences.total)}{" "}
          {occurrences.total === 1 ? "line" : "lines"}
        </h2>
        {occurrences.items.length === 0 ? (
          <p className="text-sm text-greyscale-600">
            No active line uses this entry yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-greyscale-100 text-sm">
            {occurrences.items.map((item) => (
              <li key={item.mentionId} className="flex flex-col gap-0.5 py-2">
                <HighlightedText text={item.lineText} span={item.span} />
                <span className="text-xs text-greyscale-600">
                  <AppLink
                    href={`/notes/${item.noteId}`}
                    className="underline underline-offset-2"
                  >
                    {item.noteTitle ?? "Untitled note"}
                  </AppLink>
                  {item.recipeId ? (
                    <>
                      {" · "}
                      <AppLink
                        href={`/recipes/${item.recipeId}`}
                        aria-label={`Recipe: ${item.recipeTitle ?? item.noteTitle ?? "untitled"}`}
                        className="underline underline-offset-2"
                      >
                        recipe
                      </AppLink>
                    </>
                  ) : null}
                  {item.conceptName ? ` · ${item.conceptName}` : ""}
                  {` · ${STATUS_LABELS[item.status] ?? lower(item.status)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {occurrences.nextCursor && onLoadMore ? (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </Button>
            <span className="text-sm text-greyscale-600">
              Showing {formatCount(occurrences.items.length)} of{" "}
              {formatCount(occurrences.total)}
            </span>
          </div>
        ) : null}
      </section>
    </article>
  );
}

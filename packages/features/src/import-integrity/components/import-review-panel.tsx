"use client";

import type { ReactNode } from "react";

import { Badge, Button, Card, CardContent, buttonVariants, cn } from "@peas/components";
import { RefreshCw } from "lucide-react";

import { AppLink, buildHref } from "../../app-navigation";
import { ConfirmDialog, InlineError, type MutationAction, PageLinks, formatDate, useMutation } from "../../shared";
import type {
  BookLookupView,
  DuplicateCandidate,
  FailedUrlCheck,
  ImportReviewCounts,
  Page,
} from "../types";

/** The review sections, as they appear in the URL (?review=...). */
export const IMPORT_REVIEW_SECTIONS = [
  "exact",
  "likely",
  "possible",
  "source-conflicts",
  "books",
  "failed-checks",
  "resolved",
] as const;
export type ImportReviewSection = (typeof IMPORT_REVIEW_SECTIONS)[number];

export type ImportReviewList =
  | { section: "books"; data: Page<BookLookupView> }
  | { section: "failed-checks"; data: Page<FailedUrlCheck> }
  | { section: Exclude<ImportReviewSection, "books" | "failed-checks">; data: Page<DuplicateCandidate> };

interface ImportReviewPanelProps {
  counts: ImportReviewCounts;
  list: ImportReviewList;
  /** Where the panel lives, e.g. "/import"; section and page links are built from it. */
  basePath: string;
  onResolveExactDuplicates?: MutationAction<[], { resolved: number; failed: number }>;
  onRecheckUrl?: MutationAction<[urlId: string]>;
}

const SECTION_LABELS: Record<ImportReviewSection, string> = {
  exact: "Exact duplicates",
  likely: "Likely duplicates",
  possible: "Possible duplicates",
  "source-conflicts": "Source conflicts",
  books: "Book matches",
  "failed-checks": "Failed source checks",
  resolved: "Resolved",
};

function sectionCount(section: ImportReviewSection, counts: ImportReviewCounts): number {
  switch (section) {
    case "exact":
      return counts.exactDuplicates;
    case "likely":
      return counts.likelyDuplicates;
    case "possible":
      return counts.possibleDuplicates;
    case "source-conflicts":
      return counts.sourceConflicts;
    case "books":
      return counts.bookMatchesToReview;
    case "failed-checks":
      return counts.failedSourceChecks;
    case "resolved":
      return counts.resolved;
  }
}

/**
 * The import page's review tab: counts per kind of problem, then the list for the chosen section. Duplicates open a side-by-side comparison, book matches open the candidate picker, and failed URL checks can be rechecked in place. Exact duplicates can be settled in one batch (keep the existing note, merge sources).
 */
export function ImportReviewPanel({
  counts,
  list,
  basePath,
  onResolveExactDuplicates,
  onRecheckUrl,
}: ImportReviewPanelProps): ReactNode {
  const hrefFor = (section: ImportReviewSection, page?: number) =>
    buildHref(basePath, { view: "review", review: section, page: page && page > 1 ? page : undefined });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-greyscale-600">
        <AppLink href="/notes?status=PENDING" className="text-primary hover:underline">
          {counts.pendingImports} pending
        </AppLink>
        {" · "}
        <AppLink href="/notes?status=COMPLETED" className="text-primary hover:underline">
          {counts.importedNotes} imported
        </AppLink>
      </p>

      <nav aria-label="Review sections">
        <ul className="flex flex-wrap gap-2">
          {IMPORT_REVIEW_SECTIONS.map((section) => {
            const isCurrent = list.section === section;
            return (
              <li key={section}>
                <AppLink
                  href={hrefFor(section)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(buttonVariants({ variant: isCurrent ? "default" : "outline", size: "sm" }))}
                >
                  {SECTION_LABELS[section]}
                  <span className="ml-1 tabular-nums">({sectionCount(section, counts)})</span>
                </AppLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="review-section-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-section-title" className="text-lg font-semibold">
            {SECTION_LABELS[list.section]}
          </h2>
          {list.section === "exact" && onResolveExactDuplicates && counts.exactDuplicates > 0 ? (
            <ResolveExactButton count={counts.exactDuplicates} onResolve={onResolveExactDuplicates} />
          ) : null}
        </div>

        {list.data.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-greyscale-200 px-4 py-8 text-center text-sm text-greyscale-600">
            Nothing to review here.
          </p>
        ) : list.section === "books" ? (
          <BookLookupList lookups={list.data.items} />
        ) : list.section === "failed-checks" ? (
          <FailedCheckList checks={list.data.items} onRecheckUrl={onRecheckUrl} />
        ) : (
          <DuplicateList candidates={list.data.items} />
        )}

        <PageLinks
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          getHref={(page) => hrefFor(list.section, page)}
          label={`${SECTION_LABELS[list.section]} pages`}
        />
      </section>
    </div>
  );
}

function ResolveExactButton({
  count,
  onResolve,
}: {
  count: number;
  onResolve: MutationAction<[], { resolved: number; failed: number }>;
}): ReactNode {
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          Keep existing for all {count}
        </Button>
      }
      title="Settle every exact duplicate?"
      description={
        <>
          For each of the {count} exact duplicates (the same file or identical content imported again), the existing note is kept, the incoming copy is archived, and the incoming copy's sources are attached to the existing note. Nothing is deleted, and each decision can be undone from its comparison page.
        </>
      }
      confirmLabel="Keep existing notes"
      isDestructive={false}
      onConfirm={() => onResolve()}
    />
  );
}

const KIND_LABELS: Record<DuplicateCandidate["kind"], string> = {
  EXACT: "Exact",
  LIKELY: "Likely",
  POSSIBLE: "Possible",
};

/** Pairs of notes, each linking to its side-by-side comparison. */
export function DuplicateList({ candidates }: { candidates: DuplicateCandidate[] }): ReactNode {
  return (
    <ul className="flex flex-col gap-2">
      {candidates.map((candidate) => (
        <li key={candidate.id}>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex flex-col gap-1">
                <AppLink href={`/import/duplicates/${candidate.id}`} className="font-medium text-primary hover:underline">
                  {candidate.incoming.title ?? "Untitled"}
                  <span className="text-greyscale-600"> vs. </span>
                  {candidate.existing.title ?? "Untitled"}
                </AppLink>
                <p className="text-xs text-greyscale-600">{candidate.signals.reasons.join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={candidate.kind === "EXACT" ? "destructive" : "secondary"}>
                  {KIND_LABELS[candidate.kind]}
                </Badge>
                <span className="text-sm tabular-nums">{Math.round(candidate.confidence * 100)}%</span>
                {candidate.status !== "PENDING" ? (
                  <Badge variant="outline">
                    {candidate.resolution
                      ? candidate.resolution.keep === "BOTH"
                        ? "Kept both"
                        : candidate.resolution.keep === "EXISTING"
                          ? "Kept existing"
                          : "Kept incoming"
                      : "Dismissed"}
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

const LOOKUP_LABELS: Record<BookLookupView["status"], string> = {
  PENDING: "Waiting for lookup",
  MATCHED: "Matched",
  AMBIGUOUS: "Several candidates",
  NO_MATCH: "No match found",
  ERROR: "Lookup failed",
  LEFT_UNRESOLVED: "Left as text",
};

/** Source texts that need a book decision, most recent first. */
export function BookLookupList({ lookups }: { lookups: BookLookupView[] }): ReactNode {
  return (
    <ul className="flex flex-col gap-2">
      {lookups.map((lookup) => (
        <li key={lookup.id}>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex flex-col gap-1">
                <AppLink href={`/import/books/${lookup.id}`} className="font-medium text-primary hover:underline">
                  {lookup.query}
                </AppLink>
                <p className="text-xs text-greyscale-600">
                  Cited by {lookup.noteCount} {lookup.noteCount === 1 ? "note" : "notes"}
                  {lookup.candidates.length ? ` · ${lookup.candidates.length} candidates` : ""}
                  {lookup.errorReason ? ` · ${lookup.errorReason}` : ""}
                </p>
              </div>
              <Badge variant={lookup.status === "ERROR" ? "destructive" : "secondary"}>
                {LOOKUP_LABELS[lookup.status]}
              </Badge>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function FailedCheckList({
  checks,
  onRecheckUrl,
}: {
  checks: FailedUrlCheck[];
  onRecheckUrl?: MutationAction<[urlId: string]>;
}): ReactNode {
  return (
    <ul className="flex flex-col gap-2">
      {checks.map((check) => (
        <FailedCheckRow key={check.urlId} check={check} onRecheckUrl={onRecheckUrl} />
      ))}
    </ul>
  );
}

function FailedCheckRow({
  check,
  onRecheckUrl,
}: {
  check: FailedUrlCheck;
  onRecheckUrl?: MutationAction<[urlId: string]>;
}): ReactNode {
  const recheck = useMutation(onRecheckUrl);
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-2 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href={check.originalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="break-all font-medium text-primary hover:underline"
            >
              {check.originalUrl}
            </a>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">
                {check.checkStatus === "BLOCKED" ? "Not allowed" : (check.lastFailureReason ?? "Unreachable")}
              </Badge>
              {onRecheckUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={recheck.isPending}
                  onClick={() => void recheck.run(check.urlId)}
                >
                  <RefreshCw aria-hidden="true" />
                  {recheck.isPending ? "Queuing..." : "Recheck"}
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-greyscale-600">
            {check.lastCheckedAt ? `Checked ${formatDate(check.lastCheckedAt)}` : "Never checked"}
            {check.lastSuccessfulVisitAt
              ? ` · last reachable ${formatDate(check.lastSuccessfulVisitAt)}`
              : " · never reached"}
            {check.consecutiveFailures > 1 ? ` · failed ${check.consecutiveFailures} times in a row` : ""}
          </p>
          {check.notes.length ? (
            <p className="text-xs">
              Cited by{" "}
              {check.notes.map((note, index) => (
                <span key={note.id}>
                  {index > 0 ? ", " : ""}
                  <AppLink href={`/notes/${note.id}`} className="text-primary hover:underline">
                    {note.title ?? "Untitled"}
                  </AppLink>
                </span>
              ))}
            </p>
          ) : null}
          <InlineError message={recheck.error} />
        </CardContent>
      </Card>
    </li>
  );
}

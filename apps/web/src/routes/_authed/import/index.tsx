import {
  ImportReviewBooksDocument,
  type ImportReviewBooksQuery,
  ImportReviewDuplicatesDocument,
  type ImportReviewDuplicatesQuery,
  ImportReviewFailedChecksDocument,
  type ImportReviewFailedChecksQuery,
  ImportStatsDocument,
  type ImportStatsQuery,
  ResolveExactDuplicatesDocument,
} from "~/graphql/generated";
import {
  useCacheCoordinator,
  useMutationAction,
} from "~/lib/apollo/cache-coordinator-provider";
import { useRecheckUrl } from "~/lib/import-integrity";
import { optionalEnum, optionalPage } from "~/lib/search";
import { getQueueTokenFn } from "~/server/auth.functions";

import { useCallback } from "react";

import { type QueryRef, useReadQuery } from "@apollo/client/react";
import { buttonVariants, cn } from "@peas/components";
import {
  AppLink,
  IMPORT_REVIEW_SECTIONS,
  ImportFileUpload,
  ImportProgress,
  ImportProvider,
  type ImportReviewList,
  ImportReviewPanel,
  type ImportReviewSection,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  view: optionalEnum(["upload", "review"] as const),
  review: optionalEnum(IMPORT_REVIEW_SECTIONS),
  page: optionalPage,
});

const DUPLICATE_FILTERS: Partial<
  Record<
    ImportReviewSection,
    { kind?: "EXACT" | "LIKELY" | "POSSIBLE"; status?: "PENDING" | "RESOLVED"; sourceConflicts?: boolean }
  >
> = {
  exact: { kind: "EXACT" },
  likely: { kind: "LIKELY" },
  possible: { kind: "POSSIBLE" },
  "source-conflicts": { sourceConflicts: true },
  resolved: { status: "RESOLVED" },
};

export const Route = createFileRoute("/_authed/import/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, deps }) => {
    const section = deps.review ?? "exact";
    const page = deps.page ?? 1;
    return {
      statsRef: preloadQuery(ImportStatsDocument),
      reviewRef:
        deps.view !== "review"
          ? null
          : section === "books"
            ? { section, ref: preloadQuery(ImportReviewBooksDocument, { variables: { page } }) }
            : section === "failed-checks"
              ? { section, ref: preloadQuery(ImportReviewFailedChecksDocument, { variables: { page } }) }
              : {
                  section,
                  ref: preloadQuery(ImportReviewDuplicatesDocument, {
                    variables: { ...DUPLICATE_FILTERS[section], page },
                  }),
                },
    };
  },
  head: () => ({ meta: [{ title: "Import · Peas" }] }),
  component: ImportRoute,
});

function ImportRoute() {
  const { statsRef, reviewRef } = Route.useLoaderData();
  const search = Route.useSearch();
  const isReview = search.view === "review";
  const coordinator = useCacheCoordinator();

  // Library totals live in the Apollo cache; refreshing goes through the coordinator like every other refetch
  const refreshStats = useCallback(
    () => coordinator.refresh(["IMPORT_STATS", "IMPORT_REVIEW"]),
    [coordinator]
  );
  const getQueueToken = useCallback(() => getQueueTokenFn(), []);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Import views">
        <ul className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { href: "/import", label: "Upload", isCurrent: !isReview },
              { href: "/import?view=review", label: "Review", isCurrent: isReview },
            ] as const
          ).map((view) => (
            <li key={view.label}>
              <AppLink
                href={view.href}
                aria-current={view.isCurrent ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: view.isCurrent ? "secondary" : "ghost", size: "sm" }),
                  view.isCurrent && "bg-background shadow"
                )}
              >
                {view.label}
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>
      {isReview && reviewRef ? (
        <ReviewView reviewRef={reviewRef} />
      ) : (
        <ImportProvider onStatsRefresh={refreshStats} getQueueToken={getQueueToken}>
          <div className="flex flex-col gap-6">
            <ImportFileUpload />
            <ImportProgressWithLibrary queryRef={statsRef} />
            <AppLink
              href="/import?view=review"
              className={cn(buttonVariants({ variant: "outline" }), "self-start")}
            >
              Review duplicates, book matches, and source checks
            </AppLink>
          </div>
        </ImportProvider>
      )}
    </div>
  );
}

type ReviewRef = NonNullable<ReturnType<typeof Route.useLoaderData>["reviewRef"]>;

function ReviewView({ reviewRef }: { reviewRef: ReviewRef }) {
  const onRecheckUrl = useRecheckUrl();
  const onResolveExactDuplicates = useMutationAction(ResolveExactDuplicatesDocument, {
    variables: () => ({}),
    payload: (result) => result.resolveExactDuplicates,
    result: (result) => ({
      resolved: result.resolveExactDuplicates.resolved ?? 0,
      failed: result.resolveExactDuplicates.failed ?? 0,
    }),
  });

  return (
    <ReviewData
      reviewRef={reviewRef}
      render={(counts, list) => (
        <ImportReviewPanel
          counts={counts}
          list={list}
          basePath="/import"
          onRecheckUrl={onRecheckUrl}
          onResolveExactDuplicates={onResolveExactDuplicates}
        />
      )}
    />
  );
}

type Counts = Parameters<typeof ImportReviewPanel>[0]["counts"];

function ReviewData({
  reviewRef,
  render,
}: {
  reviewRef: ReviewRef;
  render: (counts: Counts, list: ImportReviewList) => React.ReactNode;
}) {
  if (reviewRef.section === "books")
    return <BooksData queryRef={reviewRef.ref as QueryRef<ImportReviewBooksQuery>} render={render} />;
  if (reviewRef.section === "failed-checks")
    return (
      <FailedChecksData queryRef={reviewRef.ref as QueryRef<ImportReviewFailedChecksQuery>} render={render} />
    );
  return (
    <DuplicatesData
      section={reviewRef.section}
      queryRef={reviewRef.ref as QueryRef<ImportReviewDuplicatesQuery>}
      render={render}
    />
  );
}

function BooksData({
  queryRef,
  render,
}: {
  queryRef: QueryRef<ImportReviewBooksQuery>;
  render: (counts: Counts, list: ImportReviewList) => React.ReactNode;
}) {
  const { data } = useReadQuery(queryRef);
  return render(data.importReviewCounts, { section: "books", data: data.bookLookups });
}

function FailedChecksData({
  queryRef,
  render,
}: {
  queryRef: QueryRef<ImportReviewFailedChecksQuery>;
  render: (counts: Counts, list: ImportReviewList) => React.ReactNode;
}) {
  const { data } = useReadQuery(queryRef);
  return render(data.importReviewCounts, { section: "failed-checks", data: data.failedUrlChecks });
}

function DuplicatesData({
  section,
  queryRef,
  render,
}: {
  section: Exclude<ImportReviewSection, "books" | "failed-checks">;
  queryRef: QueryRef<ImportReviewDuplicatesQuery>;
  render: (counts: Counts, list: ImportReviewList) => React.ReactNode;
}) {
  const { data } = useReadQuery(queryRef);
  return render(data.importReviewCounts, { section, data: data.duplicateCandidates });
}

/** Only this leaf re-renders when the cached stats refresh. */
function ImportProgressWithLibrary({
  queryRef,
}: {
  queryRef: QueryRef<ImportStatsQuery>;
}) {
  const { data } = useReadQuery(queryRef);
  return <ImportProgress library={data.importStats} />;
}

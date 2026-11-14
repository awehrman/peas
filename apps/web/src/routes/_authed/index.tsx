import {
  CleanupAllDataDocument,
  CorpusAnalyticsDocument,
  type CorpusAnalyticsQuery,
  DashboardStatsDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";

import { type ReactNode, Suspense, useCallback } from "react";

import { type QueryRef, useReadQuery } from "@apollo/client/react";
import {
  type CleanupAllDataResult,
  CorpusAnalyticsSection,
  DashboardPageContent,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
  loader: ({ context: { preloadQuery } }) => ({
    queryRef: preloadQuery(DashboardStatsDocument),
    analyticsRef: preloadQuery(CorpusAnalyticsDocument),
  }),
  head: () => ({ meta: [{ title: "Dashboard · Peas" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { viewer } = Route.useRouteContext();
  const { queryRef, analyticsRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);

  const cleanup = useMutationAction(CleanupAllDataDocument, {
    variables: () => ({}),
    payload: (result) => result.cleanupAllData,
    result: (result) =>
      Object.fromEntries(
        (result.cleanupAllData.deletedCounts ?? []).map(({ key, count }) => [
          key,
          count,
        ])
      ),
  });

  const onCleanupAllData =
    useCallback(async (): Promise<CleanupAllDataResult> => {
      const result = await cleanup();
      return result.success
        ? {
            success: true,
            message: result.message ?? "All data has been deleted",
            deletedCounts: result.data,
          }
        : { success: false, message: result.message };
    }, [cleanup]);

  return (
    <DashboardPageContent
      stats={data.dashboardStats}
      onCleanupAllData={viewer.isAdmin ? onCleanupAllData : undefined}
      analytics={
        <Suspense fallback={null}>
          <Analytics analyticsRef={analyticsRef} />
        </Suspense>
      }
    />
  );
}

function Analytics({
  analyticsRef,
}: {
  analyticsRef: QueryRef<CorpusAnalyticsQuery>;
}): ReactNode {
  const { data } = useReadQuery(analyticsRef);
  return <CorpusAnalyticsSection analytics={data.corpusAnalytics} />;
}

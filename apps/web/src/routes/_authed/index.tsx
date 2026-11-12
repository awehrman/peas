import { CleanupAllDataDocument } from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";

import { useCallback } from "react";

import {
  type CleanupAllDataResult,
  DashboardPageContent,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
  head: () => ({ meta: [{ title: "Dashboard · Peas" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { viewer } = Route.useRouteContext();

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
      onCleanupAllData={viewer.isAdmin ? onCleanupAllData : undefined}
    />
  );
}

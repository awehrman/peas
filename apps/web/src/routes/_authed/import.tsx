import { ImportStatsDocument, type ImportStatsQuery } from "~/graphql/generated";
import { useCacheCoordinator } from "~/lib/apollo/cache-coordinator-provider";
import { getQueueTokenFn } from "~/server/auth.functions";

import { useCallback } from "react";

import { type QueryRef, useReadQuery } from "@apollo/client/react";
import {
  ImportFileUpload,
  ImportProgress,
  ImportProvider,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/import")({
  loader: ({ context: { preloadQuery } }) => ({
    queryRef: preloadQuery(ImportStatsDocument),
  }),
  head: () => ({ meta: [{ title: "Import · Peas" }] }),
  component: ImportRoute,
});

function ImportRoute() {
  const { queryRef } = Route.useLoaderData();
  const coordinator = useCacheCoordinator();

  // Library totals live in the Apollo cache; refreshing goes through the coordinator like every other refetch
  const refreshStats = useCallback(
    () => coordinator.refresh(["IMPORT_STATS"]),
    [coordinator]
  );
  const getQueueToken = useCallback(() => getQueueTokenFn(), []);

  return (
    <ImportProvider onStatsRefresh={refreshStats} getQueueToken={getQueueToken}>
      <div className="flex flex-col gap-6">
        <ImportFileUpload />
        <ImportProgressWithLibrary queryRef={queryRef} />
      </div>
    </ImportProvider>
  );
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

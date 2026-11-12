import { ImportStatsDocument } from "~/graphql/generated";
import { getQueueTokenFn } from "~/server/auth.functions";

import { useCallback } from "react";

import { useApolloClient, useReadQuery } from "@apollo/client/react";
import {
  ImportActivityList,
  ImportFileUpload,
  ImportProvider,
  type ImportStatsState,
  useInitialization,
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
  const { data } = useReadQuery(queryRef);
  const client = useApolloClient();

  const refreshStats = useCallback(async (): Promise<ImportStatsState> => {
    const { data: fresh } = await client.query({
      query: ImportStatsDocument,
      fetchPolicy: "network-only",
    });
    const stats = fresh?.importStats ?? data.importStats;
    return {
      numberOfNotes: stats.numberOfNotes,
      numberOfIngredients: stats.numberOfIngredients,
      numberOfParsingErrors: stats.numberOfParsingErrors,
    };
  }, [client, data.importStats]);

  const getQueueToken = useCallback(() => getQueueTokenFn(), []);

  return (
    <ImportProvider onStatsRefresh={refreshStats} getQueueToken={getQueueToken}>
      <ImportPage
        initialNoteCount={data.importStats.numberOfNotes}
        initialIngredientCount={data.importStats.numberOfIngredients}
        initialParsingErrorCount={data.importStats.numberOfParsingErrors}
      />
    </ImportProvider>
  );
}

interface ImportPageProps {
  initialNoteCount: number;
  initialIngredientCount: number;
  initialParsingErrorCount: number;
}

function ImportPage({
  initialNoteCount,
  initialIngredientCount,
  initialParsingErrorCount,
}: ImportPageProps) {
  useInitialization({
    initialNoteCount,
    initialIngredientCount,
    initialParsingErrorCount,
  });

  return (
    <div className="grid gap-6">
      <section
        aria-labelledby="import-notes-heading"
        className="rounded-lg border bg-card p-5 shadow-xs"
      >
        <h2 id="import-notes-heading" className="mb-4 text-base font-semibold">
          Import notes
        </h2>
        <ImportFileUpload />
      </section>
      <ImportActivityList />
    </div>
  );
}

import { CorpusHealthTrendsDocument } from "~/graphql/generated";
import { useHealthActions } from "~/lib/teach";

import { useReadQuery } from "@apollo/client/react";
import { HealthPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/teach/health")({
  loader: ({ context: { preloadQuery } }) => ({
    queryRef: preloadQuery(CorpusHealthTrendsDocument, {
      variables: { weeks: 12 },
    }),
  }),
  head: () => ({ meta: [{ title: "Health · Teach Peas · Peas" }] }),
  component: HealthPage,
});

function HealthPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const actions = useHealthActions();
  return <HealthPageContent trends={data.corpusHealthTrends} {...actions} />;
}

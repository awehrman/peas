import { NotFoundState } from "~/components/route-states";
import {
  DiscoveryExamplesDocument,
  DiscoveryReviewDocument,
} from "~/graphql/generated";
import { optionalText } from "~/lib/search";
import { queueNeighbors, useTeachActions } from "~/lib/teach";

import { useCallback } from "react";

import { useApolloClient, useReadQuery } from "@apollo/client/react";
import {
  type DiscoveryExample,
  DiscoveryReviewPageContent,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_authed/teach/$discoveryId")({
  validateSearch: z.object({ taught: optionalText }),
  loader: ({ context: { preloadQuery }, params }) => ({
    queryRef: preloadQuery(DiscoveryReviewDocument, {
      variables: { id: params.discoveryId },
    }),
  }),
  head: () => ({ meta: [{ title: "Review · Teach Peas · Peas" }] }),
  component: DiscoveryReviewPage,
});

function DiscoveryReviewPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const search = Route.useSearch();
  const client = useApolloClient();
  const {
    onApplyDecision,
    onDefer,
    onMarkNoise,
    onPreviewDecision,
    onSearchConcepts,
  } = useTeachActions();
  const discoveryId = data.discovery?.id ?? "";

  const onLoadExamples = useCallback(
    async (offset: number, limit: number): Promise<DiscoveryExample[]> => {
      const { data: found } = await client.query({
        query: DiscoveryExamplesDocument,
        variables: { id: discoveryId, offset, limit },
        fetchPolicy: "network-only",
      });
      return found?.discovery?.examples ?? [];
    },
    [client, discoveryId]
  );

  if (!data.discovery) return <NotFoundState />;
  const { previousId, nextId } = queueNeighbors(
    data.discoveryQueue.items.map((item) => item.id),
    data.discovery.id
  );

  return (
    <DiscoveryReviewPageContent
      key={data.discovery.id}
      discovery={data.discovery}
      examples={data.discovery.examples}
      vocabulary={data.vocabulary}
      previousId={previousId}
      nextId={nextId}
      taughtMessage={search.taught ?? null}
      onApplyDecision={onApplyDecision}
      onDefer={onDefer}
      onMarkNoise={onMarkNoise}
      onPreviewDecision={onPreviewDecision}
      onSearchConcepts={onSearchConcepts}
      onLoadExamples={onLoadExamples}
    />
  );
}

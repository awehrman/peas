import {
  CorpusHealthDocument,
  DiscoveryQueueDocument,
  RefreshDiscoveriesDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";
import { optionalEnum, optionalText } from "~/lib/search";

import { useReadQuery } from "@apollo/client/react";
import {
  CorpusHealthCard,
  DISCOVERY_TYPES,
  DiscoveryQueuePageContent,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  type: optionalEnum(DISCOVERY_TYPES),
  cursor: optionalText,
  taught: optionalText,
});

export const Route = createFileRoute("/_authed/teach/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ type: search.type, cursor: search.cursor }),
  loader: ({ context: { preloadQuery }, deps }) => ({
    queryRef: preloadQuery(DiscoveryQueueDocument, {
      variables: { type: deps.type ?? null, cursor: deps.cursor ?? null },
    }),
    healthRef: preloadQuery(CorpusHealthDocument),
  }),
  head: () => ({ meta: [{ title: "Teach Peas · Peas" }] }),
  component: TeachQueuePage,
});

function TeachQueuePage() {
  const { queryRef, healthRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { data: health } = useReadQuery(healthRef);
  const search = Route.useSearch();
  const onRefresh = useMutationAction(RefreshDiscoveriesDocument, {
    variables: () => ({}),
    payload: (result) => result.refreshDiscoveries,
  });

  return (
    <DiscoveryQueuePageContent
      items={data.discoveryQueue.items}
      counts={data.discoveryCounts}
      activeType={search.type ?? null}
      nextCursor={data.discoveryQueue.nextCursor ?? null}
      taughtMessage={search.taught ?? null}
      onRefresh={onRefresh}
      summary={<CorpusHealthCard health={health.corpusHealth} />}
    />
  );
}

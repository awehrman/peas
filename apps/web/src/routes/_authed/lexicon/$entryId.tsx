import { NotFoundState } from "~/components/route-states";
import { LexiconEntryPageDocument } from "~/graphql/generated";

import { useTransition } from "react";

import { useQueryRefHandlers, useReadQuery } from "@apollo/client/react";
import { LexiconEntryPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/lexicon/$entryId")({
  loader: ({ context: { preloadQuery }, params }) => ({
    queryRef: preloadQuery(LexiconEntryPageDocument, {
      variables: { id: params.entryId },
    }),
  }),
  head: () => ({ meta: [{ title: "Lexicon entry · Peas" }] }),
  component: LexiconEntryPage,
});

function LexiconEntryPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { fetchMore } = useQueryRefHandlers(queryRef);
  const [isLoadingMore, startLoadMore] = useTransition();
  if (!data.lexiconEntry) return <NotFoundState />;
  const { occurrences, ...entry } = data.lexiconEntry;
  const { nextCursor } = occurrences;
  return (
    <LexiconEntryPageContent
      entry={entry}
      occurrences={occurrences}
      isLoadingMore={isLoadingMore}
      onLoadMore={
        nextCursor
          ? () =>
              startLoadMore(() => {
                void fetchMore({ variables: { after: nextCursor } });
              })
          : undefined
      }
    />
  );
}

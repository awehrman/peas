import { NotFoundState } from "~/components/route-states";
import { ConceptDetailDocument } from "~/graphql/generated";
import { useTeachActions } from "~/lib/teach";

import { useReadQuery } from "@apollo/client/react";
import { ConceptDetailPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/concepts/$id")({
  loader: ({ context: { preloadQuery }, params }) => ({
    queryRef: preloadQuery(ConceptDetailDocument, {
      variables: { id: params.id },
    }),
  }),
  head: () => ({ meta: [{ title: "Concept · Peas" }] }),
  component: ConceptPage,
});

function ConceptPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { onApplyDecision, onSearchConcepts } = useTeachActions();
  if (!data.concept) return <NotFoundState />;
  return (
    <ConceptDetailPageContent
      concept={data.concept}
      onApplyDecision={onApplyDecision}
      onSearchConcepts={onSearchConcepts}
    />
  );
}

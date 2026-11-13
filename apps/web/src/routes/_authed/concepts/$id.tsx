import { NotFoundState } from "~/components/route-states";
import { ConceptDetailDocument } from "~/graphql/generated";
import { useConceptEditActions } from "~/lib/concepts";
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
  const { id } = Route.useParams();
  const { onApplyDecision, onPreviewDecision, onSearchConcepts } =
    useTeachActions();
  const editActions = useConceptEditActions(id);
  if (!data.concept) return <NotFoundState />;

  const recipesHref = `/recipes?concept=${encodeURIComponent(data.concept.id)}`;
  return (
    <ConceptDetailPageContent
      concept={data.concept}
      recipesHref={recipesHref}
      onApplyDecision={onApplyDecision}
      onSearchConcepts={onSearchConcepts}
      onPreview={onPreviewDecision}
      {...editActions}
    />
  );
}

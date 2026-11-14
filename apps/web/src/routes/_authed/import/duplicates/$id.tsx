import { NotFoundState } from "~/components/route-states";
import {
  DuplicateCandidateDetailDocument,
  ResolveDuplicateDocument,
  UndoDuplicateResolutionDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";
import { useDuplicatePreview } from "~/lib/import-integrity";

import { useReadQuery } from "@apollo/client/react";
import { type DuplicateResolution, DuplicateReviewPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/import/duplicates/$id")({
  loader: ({ context: { preloadQuery }, params }) => ({
    queryRef: preloadQuery(DuplicateCandidateDetailDocument, {
      variables: { id: params.id },
    }),
  }),
  head: () => ({ meta: [{ title: "Possible duplicate · Peas" }] }),
  component: DuplicateReviewPage,
});

function DuplicateReviewPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { id } = Route.useParams();
  const onPreview = useDuplicatePreview(id);

  const onResolve = useMutationAction(ResolveDuplicateDocument, {
    variables: (input: DuplicateResolution) => ({ id, input }),
    payload: (result) => result.resolveDuplicate,
  });
  const onUndo = useMutationAction(UndoDuplicateResolutionDocument, {
    variables: () => ({ id }),
    payload: (result) => result.undoDuplicateResolution,
  });

  if (!data.duplicateCandidate) return <NotFoundState />;
  return (
    <DuplicateReviewPageContent
      detail={data.duplicateCandidate}
      onPreview={onPreview}
      onResolve={onResolve}
      onUndo={onUndo}
    />
  );
}

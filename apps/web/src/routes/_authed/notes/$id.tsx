import { NotFoundState } from "~/components/route-states";
import {
  NoteDetailDocument,
  PromoteNoteToRecipeDocument,
  SetLineReviewStatusDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";
import { canCurateKnowledge } from "~/lib/permissions";
import { useTeachActions } from "~/lib/teach";

import { useReadQuery } from "@apollo/client/react";
import { type LineReviewStatus, NoteDetailPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/notes/$id")({
  loader: ({ context: { preloadQuery }, params }) => ({
    queryRef: preloadQuery(NoteDetailDocument, {
      variables: { id: params.id },
    }),
  }),
  head: () => ({ meta: [{ title: "Note · Peas" }] }),
  component: NoteDetailPage,
});

function NoteDetailPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { viewer } = Route.useRouteContext();
  const { onApplyDecision, onSearchConcepts } = useTeachActions();

  // The payload returns the refreshed note, so this view (and any other view of the note) updates from the cache.
  const onSetReviewStatus = useMutationAction(SetLineReviewStatusDocument, {
    variables: (lineId: string, status: LineReviewStatus) => ({
      lineId,
      status,
    }),
    payload: (result) => result.setLineReviewStatus,
  });

  const onPromoteToRecipe = useMutationAction(PromoteNoteToRecipeDocument, {
    variables: (noteId: string) => ({ noteId }),
    payload: (result) => result.promoteNoteToRecipe,
    result: (result) => ({
      recipeId: result.promoteNoteToRecipe.recipeId ?? "",
    }),
  });

  if (!data.note) return <NotFoundState />;
  return (
    <NoteDetailPageContent
      note={data.note}
      onSetReviewStatus={onSetReviewStatus}
      onPromoteToRecipe={onPromoteToRecipe}
      onCorrectMention={canCurateKnowledge(viewer) ? onApplyDecision : undefined}
      onSearchConcepts={canCurateKnowledge(viewer) ? onSearchConcepts : undefined}
    />
  );
}

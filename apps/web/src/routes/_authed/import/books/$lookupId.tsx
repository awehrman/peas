import { NotFoundState } from "~/components/route-states";
import {
  BookLookupDetailDocument,
  CreateBookManuallyDocument,
  LeaveBookUnresolvedDocument,
  RetryBookLookupDocument,
  SelectBookCandidateDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";

import { useReadQuery } from "@apollo/client/react";
import { BookReviewPageContent, type ManualBookInput } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/import/books/$lookupId")({
  loader: ({ context: { preloadQuery }, params }) => ({
    queryRef: preloadQuery(BookLookupDetailDocument, {
      variables: { id: params.lookupId },
    }),
  }),
  head: () => ({ meta: [{ title: "Book match · Peas" }] }),
  component: BookReviewPage,
});

function BookReviewPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { lookupId } = Route.useParams();

  const onSelectCandidate = useMutationAction(SelectBookCandidateDocument, {
    variables: (workKey: string) => ({ lookupId, workKey }),
    payload: (result) => result.selectBookCandidate,
  });
  const onCreateManually = useMutationAction(CreateBookManuallyDocument, {
    variables: (input: ManualBookInput) => ({ lookupId, input }),
    payload: (result) => result.createBookManually,
  });
  const onLeaveUnresolved = useMutationAction(LeaveBookUnresolvedDocument, {
    variables: () => ({ lookupId }),
    payload: (result) => result.leaveBookUnresolved,
  });
  const onRetry = useMutationAction(RetryBookLookupDocument, {
    variables: () => ({ lookupId }),
    payload: (result) => result.retryBookLookup,
  });

  if (!data.bookLookup) return <NotFoundState />;
  return (
    <BookReviewPageContent
      lookup={data.bookLookup}
      onSelectCandidate={onSelectCandidate}
      onCreateManually={onCreateManually}
      onLeaveUnresolved={onLeaveUnresolved}
      onRetry={onRetry}
    />
  );
}

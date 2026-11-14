import { NotFoundState } from "~/components/route-states";
import {
  ConceptDetailDocument,
  ConceptExplorerDocument,
  type ConceptExplorerQuery,
  type ConceptExplorerQueryVariables,
  type FoodRelationshipType,
} from "~/graphql/generated";
import { conceptHref, useConceptEditActions } from "~/lib/concepts";
import { optionalFlag } from "~/lib/search";
import { useTeachActions } from "~/lib/teach";

import { type ReactNode, Suspense, useTransition } from "react";

import { type QueryRef, useReadQuery } from "@apollo/client/react";
import {
  ConceptDetailPageContent,
  type ConceptExplorerOptions,
  ConceptUsagePanel,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  madeFrom: optionalFlag,
  review: optionalFlag,
});

const WITH_MADE_FROM: FoodRelationshipType[] = [
  "IS_A",
  "PART_OF",
  "DERIVED_FROM",
  "PROCESSED_FROM",
];

export const Route = createFileRoute("/_authed/concepts/$id")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, params, deps }) => ({
    queryRef: preloadQuery(ConceptDetailDocument, {
      variables: { id: params.id },
    }),
    explorerRef: preloadQuery(ConceptExplorerDocument, {
      variables: {
        id: params.id,
        expand: deps.madeFrom ? WITH_MADE_FROM : null,
        includeNeedsReview: deps.review ?? false,
      },
    }),
  }),
  head: () => ({ meta: [{ title: "Concept · Peas" }] }),
  component: ConceptPage,
});

function ConceptPage() {
  const { queryRef, explorerRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isUpdating, startTransition] = useTransition();
  const { onApplyDecision, onPreviewDecision, onSearchConcepts } =
    useTeachActions();
  const editActions = useConceptEditActions(id);
  if (!data.concept) return <NotFoundState />;

  const conceptName = data.concept.canonicalName;
  const options: ConceptExplorerOptions = {
    includeMadeFrom: search.madeFrom === true,
    includeNeedsReview: search.review === true,
  };
  const onOptionsChange = (next: ConceptExplorerOptions) =>
    startTransition(() => {
      void navigate({
        search: (previous) => ({
          ...previous,
          madeFrom: next.includeMadeFrom || undefined,
          review: next.includeNeedsReview || undefined,
        }),
        replace: true,
        resetScroll: false,
      });
    });

  const recipesHref = `/recipes?concept=${encodeURIComponent(data.concept.id)}`;
  return (
    <ConceptDetailPageContent
      concept={data.concept}
      recipesHref={recipesHref}
      graphHref={`/concepts/${encodeURIComponent(data.concept.id)}/graph`}
      onApplyDecision={onApplyDecision}
      onSearchConcepts={onSearchConcepts}
      onPreview={onPreviewDecision}
      usage={
        <Suspense
          fallback={
            <ConceptUsagePanel
              conceptName={conceptName}
              data={null}
              options={options}
              onOptionsChange={onOptionsChange}
            />
          }
        >
          <ConceptExplorer
            explorerRef={explorerRef}
            occurrencesHref={conceptHref(id, options, "usage")}
            conceptName={conceptName}
            options={options}
            onOptionsChange={onOptionsChange}
            isUpdating={isUpdating}
          />
        </Suspense>
      }
      {...editActions}
    />
  );
}

function ConceptExplorer({
  explorerRef,
  conceptName,
  options,
  onOptionsChange,
  isUpdating,
  occurrencesHref,
}: {
  explorerRef: QueryRef<ConceptExplorerQuery, ConceptExplorerQueryVariables>;
  occurrencesHref: string;
  conceptName: string;
  options: ConceptExplorerOptions;
  onOptionsChange: (options: ConceptExplorerOptions) => void;
  isUpdating: boolean;
}): ReactNode {
  const { data } = useReadQuery(explorerRef);
  return (
    <ConceptUsagePanel
      conceptName={conceptName}
      data={data.concept}
      options={options}
      onOptionsChange={onOptionsChange}
      isLoading={isUpdating}
      occurrencesHref={occurrencesHref}
    />
  );
}

import { NotFoundState } from "~/components/route-states";
import {
  ConceptOccurrencesDocument,
  type ConceptOccurrencesQuery,
} from "~/graphql/generated";
import { conceptHref } from "~/lib/concepts";
import {
  WITH_MADE_FROM,
  occurrenceSearchSchema,
  toOccurrenceFilters,
  toOccurrenceSearch,
} from "~/lib/explorer-search";

import { useTransition } from "react";

import { useQueryRefHandlers, useReadQuery } from "@apollo/client/react";
import {
  type ConceptOccurrenceFilterOptions,
  ConceptOccurrencesPageContent,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/concepts/$id_/usage")({
  validateSearch: occurrenceSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, params, deps }) => {
    const filters = toOccurrenceFilters(deps);
    const expand = filters.includeMadeFrom ? WITH_MADE_FROM : null;
    return {
      queryRef: preloadQuery(ConceptOccurrencesDocument, {
        variables: {
          conceptId: params.id,
          expand,
          includeNeedsReview: filters.includeNeedsReview,
          filter: {
            expand,
            includeNeedsReview: filters.includeNeedsReview,
            preparationKey: filters.preparationKey ?? null,
            attribute: filters.attribute ?? null,
            sourceId: filters.sourceId ?? null,
            categoryId: filters.categoryId ?? null,
            status: filters.status ?? null,
          },
        },
      }),
    };
  },
  head: () => ({ meta: [{ title: "Lines with a food · Peas" }] }),
  component: ConceptUsagePage,
});

/** Filter choices from what the concept's mentions and notes actually have, one entry per preparation. */
function filterOptions(
  data: ConceptOccurrencesQuery
): ConceptOccurrenceFilterOptions {
  const distributions = data.concept?.distributions;
  const preparations = new Map<string, string>();
  for (const row of distributions?.preparations ?? [])
    preparations.set(row.preparationKey, row.label);
  return {
    preparations: [...preparations].map(([key, label]) => ({ key, label })),
    attributes: (distributions?.attributes ?? []).map((row) => ({
      key: `${row.definitionKey}:${row.valueKey}`,
      label: `${row.definitionName}: ${row.label}`,
    })),
    sources: data.conceptOccurrenceFacets.sources,
    categories: data.conceptOccurrenceFacets.categories,
  };
}

function ConceptUsagePage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { fetchMore } = useQueryRefHandlers(queryRef);
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isUpdating, startUpdate] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();
  if (!data.concept) return <NotFoundState />;

  const filters = toOccurrenceFilters(search);
  const { nextCursor } = data.conceptOccurrences;

  return (
    <ConceptOccurrencesPageContent
      concept={data.concept}
      page={data.conceptOccurrences}
      options={filterOptions(data)}
      filters={filters}
      isUpdating={isUpdating}
      isLoadingMore={isLoadingMore}
      backHref={conceptHref(id, filters)}
      onFiltersChange={(next) =>
        startUpdate(() => {
          void navigate({
            search: toOccurrenceSearch(next),
            replace: true,
            resetScroll: false,
          });
        })
      }
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

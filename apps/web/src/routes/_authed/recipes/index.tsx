import {
  PromoteCompletedNotesDocument,
  RecipesPageDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";
import { optionalPage, optionalText } from "~/lib/search";

import { useReadQuery } from "@apollo/client/react";
import { RecipesListPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  q: optionalText,
  category: optionalText,
  tag: optionalText,
  concept: optionalText,
  page: optionalPage,
});

export const Route = createFileRoute("/_authed/recipes/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, deps }) => ({
    queryRef: preloadQuery(RecipesPageDocument, {
      variables: {
        query: deps.q ?? null,
        category: deps.category ?? null,
        tag: deps.tag ?? null,
        conceptId: deps.concept ?? null,
        page: deps.page ?? 1,
      },
    }),
  }),
  head: () => ({ meta: [{ title: "Recipes · Peas" }] }),
  component: RecipesPage,
});

function RecipesPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const search = Route.useSearch();
  const { viewer } = Route.useRouteContext();

  const promoteCompletedNotes = useMutationAction(
    PromoteCompletedNotesDocument,
    {
      variables: () => ({}),
      payload: (result) => result.promoteCompletedNotes,
      result: (result) => ({
        created: result.promoteCompletedNotes.created ?? 0,
      }),
    }
  );

  return (
    <RecipesListPageContent
      data={data.recipes}
      filters={{
        query: search.q,
        category: search.category,
        tag: search.tag,
        conceptId: search.concept,
      }}
      options={data.recipeTaxonomy}
      onPromoteCompletedNotes={
        viewer.isAdmin ? promoteCompletedNotes : undefined
      }
    />
  );
}

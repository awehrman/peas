import { ConceptsPageDocument } from "~/graphql/generated";
import { optionalPage, optionalText } from "~/lib/search";

import { useReadQuery } from "@apollo/client/react";
import { ConceptsPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({ query: optionalText, page: optionalPage });

export const Route = createFileRoute("/_authed/concepts/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, deps }) => ({
    queryRef: preloadQuery(ConceptsPageDocument, {
      variables: { query: deps.query ?? null, page: deps.page ?? 1 },
    }),
  }),
  head: () => ({ meta: [{ title: "Concepts · Peas" }] }),
  component: ConceptsPage,
});

function ConceptsPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const search = Route.useSearch();
  return <ConceptsPageContent data={data.concepts} query={search.query} />;
}

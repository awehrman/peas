import { UnknownExpressionsPageDocument } from "~/graphql/generated";
import { optionalEnum, optionalPage, optionalText } from "~/lib/search";

import { useReadQuery } from "@apollo/client/react";
import { UnknownExpressionsPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  type: optionalEnum([
    "UNKNOWN_FOOD_PHRASE",
    "UNKNOWN_MODIFIER",
    "AMBIGUOUS_MATCH",
  ] as const),
  source: optionalText,
  page: optionalPage,
});

export const Route = createFileRoute("/_authed/lexicon/unknown")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, deps }) => ({
    queryRef: preloadQuery(UnknownExpressionsPageDocument, {
      variables: {
        type: deps.type ?? null,
        sourceId: deps.source ?? null,
        page: deps.page ?? 1,
      },
    }),
  }),
  head: () => ({ meta: [{ title: "Unknown expressions · Peas" }] }),
  component: UnknownExpressionsPage,
});

function UnknownExpressionsPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const search = Route.useSearch();
  return (
    <UnknownExpressionsPageContent
      data={data.unknownExpressions}
      type={search.type ?? null}
      sourceId={search.source}
      sources={data.unknownExpressionSources}
    />
  );
}

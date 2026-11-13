import { LexiconPageDocument } from "~/graphql/generated";
import { optionalEnum, optionalPage, optionalText } from "~/lib/search";

import { useReadQuery } from "@apollo/client/react";
import {
  LEXICON_ROLE_FILTERS,
  LexiconPageContent,
  type LexiconRoleFilter,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ROLES = LEXICON_ROLE_FILTERS.flatMap((filter) =>
  filter.role ? [filter.role] : []
) as [LexiconRoleFilter, ...LexiconRoleFilter[]];

const searchSchema = z.object({
  query: optionalText,
  role: optionalEnum(ROLES),
  page: optionalPage,
});

export const Route = createFileRoute("/_authed/lexicon/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, deps }) => ({
    queryRef: preloadQuery(LexiconPageDocument, {
      variables: {
        query: deps.query ?? null,
        role: deps.role ?? null,
        page: deps.page ?? 1,
      },
    }),
  }),
  head: () => ({ meta: [{ title: "Lexicon · Peas" }] }),
  component: LexiconPage,
});

function LexiconPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const search = Route.useSearch();
  return (
    <LexiconPageContent
      data={data.lexicon}
      query={search.query}
      role={search.role ?? null}
    />
  );
}

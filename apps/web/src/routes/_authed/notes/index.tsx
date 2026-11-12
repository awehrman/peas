import { NotesPageDocument } from "~/graphql/generated";
import { optionalEnum, optionalPage, optionalText } from "~/lib/search";

import { useReadQuery } from "@apollo/client/react";
import { NOTE_STATUS_OPTIONS, NotesListPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  status: optionalEnum(NOTE_STATUS_OPTIONS),
  q: optionalText,
  page: optionalPage,
});

export const Route = createFileRoute("/_authed/notes/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, deps }) => ({
    queryRef: preloadQuery(NotesPageDocument, {
      variables: {
        status: deps.status ?? null,
        query: deps.q ?? null,
        page: deps.page ?? 1,
      },
    }),
  }),
  head: () => ({ meta: [{ title: "Notes · Peas" }] }),
  component: NotesPage,
});

function NotesPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const search = Route.useSearch();
  return (
    <NotesListPageContent
      data={data.notes}
      filters={{ status: search.status, query: search.q }}
    />
  );
}

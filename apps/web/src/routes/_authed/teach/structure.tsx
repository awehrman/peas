import { StructureReviewPageDocument } from "~/graphql/generated";
import { optionalEnum, optionalPage, optionalText } from "~/lib/search";
import { useStructureActions } from "~/lib/structure";

import { useReadQuery } from "@apollo/client/react";
import { StructureReviewPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  status: optionalEnum(["OPEN", "DECIDED"] as const),
  pattern: optionalText,
  page: optionalPage,
});

export const Route = createFileRoute("/_authed/teach/structure")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, deps }) => ({
    queryRef: preloadQuery(StructureReviewPageDocument, {
      variables: {
        status: deps.status ?? "OPEN",
        patternKey: deps.pattern ?? null,
        page: deps.page ?? 1,
      },
    }),
  }),
  head: () => ({ meta: [{ title: "Structure · Teach Peas · Peas" }] }),
  component: StructurePage,
});

function StructurePage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const search = Route.useSearch();
  const actions = useStructureActions();
  return (
    <StructureReviewPageContent
      data={{
        counts: data.structureCounts,
        proposals: data.structureProposals,
        patterns: data.structurePatterns,
      }}
      status={search.status ?? "OPEN"}
      pattern={search.pattern}
      {...actions}
    />
  );
}

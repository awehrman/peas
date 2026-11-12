import { PlaygroundDocument, type PlaygroundQuery } from "~/graphql/generated";
import { optionalEnum, optionalText } from "~/lib/search";
import { useTeachActions } from "~/lib/teach";

import { type QueryRef, useReadQuery } from "@apollo/client/react";
import { PlaygroundPageContent } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  line: optionalText,
  mode: optionalEnum(["CONSERVATIVE", "EXPLORATORY"] as const),
});

export const Route = createFileRoute("/_authed/teach/playground")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, deps }) => ({
    queryRef: deps.line
      ? preloadQuery(PlaygroundDocument, {
          variables: { line: deps.line, mode: deps.mode ?? "CONSERVATIVE" },
        })
      : null,
  }),
  head: () => ({ meta: [{ title: "Playground · Teach Peas · Peas" }] }),
  component: PlaygroundPage,
});

function PlaygroundPage() {
  const { queryRef } = Route.useLoaderData();
  return queryRef ? (
    <WithResult queryRef={queryRef} />
  ) : (
    <PlaygroundView result={null} />
  );
}

/** Reads the preloaded result; split out because hooks cannot be called conditionally. */
function WithResult({ queryRef }: { queryRef: QueryRef<PlaygroundQuery> }) {
  const { data } = useReadQuery(queryRef);
  return <PlaygroundView result={data.playground} />;
}

function PlaygroundView({
  result,
}: {
  result: PlaygroundQuery["playground"] | null;
}) {
  const search = Route.useSearch();
  const { onPreviewDecision } = useTeachActions();
  return (
    <PlaygroundPageContent
      key={`${search.line ?? ""}|${search.mode ?? ""}`}
      line={search.line ?? ""}
      mode={search.mode ?? "CONSERVATIVE"}
      result={result}
      onPreviewDecision={onPreviewDecision}
    />
  );
}

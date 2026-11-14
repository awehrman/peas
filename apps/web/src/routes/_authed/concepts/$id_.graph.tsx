import { NotFoundState } from "~/components/route-states";
import { ConceptGraphPageDocument } from "~/graphql/generated";
import {
  graphSearchSchema,
  graphSearchString,
  toGraphOptions,
  toGraphSearch,
} from "~/lib/explorer-search";

import { useTransition } from "react";

import { useReadQuery } from "@apollo/client/react";
import {
  ConceptGraphView,
  GRAPH_RELATIONSHIP_TYPES,
  type GraphRelationshipType,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/concepts/$id_/graph")({
  validateSearch: graphSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { preloadQuery }, params, deps }) => {
    const options = toGraphOptions(deps);
    return {
      queryRef: preloadQuery(ConceptGraphPageDocument, {
        variables: {
          conceptId: params.id,
          depth: options.depth,
          types: options.types,
          direction: options.direction,
        },
      }),
    };
  },
  head: () => ({ meta: [{ title: "Relationships · Peas" }] }),
  component: ConceptGraphPage,
});

function ConceptGraphPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isUpdating, startUpdate] = useTransition();
  if (!data.concept || !data.conceptGraph) return <NotFoundState />;

  const options = toGraphOptions(search);
  const suffix = graphSearchString(toGraphSearch(options));
  return (
    <ConceptGraphView
      graph={data.conceptGraph}
      centerName={data.concept.canonicalName}
      options={options}
      isUpdating={isUpdating}
      backHref={`/concepts/${encodeURIComponent(data.concept.id)}`}
      graphHref={(conceptId) =>
        `/concepts/${encodeURIComponent(conceptId)}/graph${suffix}`
      }
      onOptionsChange={(next) =>
        startUpdate(() => {
          void navigate({
            search: toGraphSearch({
              ...next,
              types: next.types.filter((type): type is GraphRelationshipType =>
                (GRAPH_RELATIONSHIP_TYPES as readonly string[]).includes(type)
              ),
            }),
            replace: true,
            resetScroll: false,
          });
        })
      }
    />
  );
}

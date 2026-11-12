import {
  CreateIngredientDocument,
  IngredientDetailDocument,
  type IngredientDetailQuery,
  IngredientsPageDocument,
  SaveIngredientDocument,
  SearchIngredientsDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";
import { optionalEnum, optionalText } from "~/lib/search";

import { useCallback } from "react";

import type { QueryRef } from "@apollo/client/react";
import { useApolloClient, useReadQuery } from "@apollo/client/react";
import {
  INGREDIENT_GROUPINGS,
  INGREDIENT_VIEWS,
  type IngredientCreateInput,
  type IngredientDetail,
  type IngredientOption,
  type IngredientSaveInput,
  IngredientsPageContent,
  groupIngredients,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  view: optionalEnum(INGREDIENT_VIEWS),
  group: optionalEnum(INGREDIENT_GROUPINGS),
  id: optionalText,
});

export const Route = createFileRoute("/_authed/ingredients")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ view: search.view ?? "all", id: search.id }),
  loader: ({ context: { preloadQuery }, deps }) => ({
    listRef: preloadQuery(IngredientsPageDocument, {
      variables: { view: deps.view },
    }),
    detailRef: deps.id
      ? preloadQuery(IngredientDetailDocument, { variables: { id: deps.id } })
      : null,
  }),
  head: () => ({ meta: [{ title: "Ingredients · Peas" }] }),
  component: IngredientsPage,
});

function IngredientsPage() {
  const { detailRef } = Route.useLoaderData();
  return detailRef ? (
    <WithSelectedIngredient detailRef={detailRef} />
  ) : (
    <IngredientsView selected={null} />
  );
}

/** Reads the selected ingredient's preloaded detail; split out because hooks cannot be called conditionally. */
function WithSelectedIngredient({
  detailRef,
}: {
  detailRef: QueryRef<IngredientDetailQuery>;
}) {
  const { data } = useReadQuery(detailRef);
  return <IngredientsView selected={data.ingredient ?? null} />;
}

function IngredientsView({ selected }: { selected: IngredientDetail | null }) {
  const { listRef } = Route.useLoaderData();
  const { data } = useReadQuery(listRef);
  const search = Route.useSearch();
  const client = useApolloClient();
  const view = search.view ?? "all";
  const grouping = search.group ?? "name";
  const onSave = useMutationAction(SaveIngredientDocument, {
    variables: (input: IngredientSaveInput) => ({ input }),
    payload: (result) => result.saveIngredient,
    result: (result) => ({ nextId: result.saveIngredient.nextId ?? null }),
  });

  const onCreate = useMutationAction(CreateIngredientDocument, {
    variables: (input: IngredientCreateInput) => ({ input }),
    payload: (result) => result.createIngredient,
    result: (result) => ({ id: result.createIngredient.id ?? "" }),
  });

  const onSearch = useCallback(
    async (query: string, excludeId?: string): Promise<IngredientOption[]> => {
      const { data: found } = await client.query({
        query: SearchIngredientsDocument,
        variables: { query, excludeId: excludeId ?? null },
        fetchPolicy: "network-only",
      });
      return found?.searchIngredients ?? [];
    },
    [client]
  );

  return (
    <IngredientsPageContent
      view={view}
      grouping={grouping}
      groups={groupIngredients(data.ingredients, grouping, view)}
      counts={data.ingredientCounts}
      selected={selected}
      categoryOptions={data.ingredientCategoryNames}
      onSave={onSave}
      onCreate={onCreate}
      onSearch={onSearch}
    />
  );
}

import { NotFoundState } from "~/components/route-states";
import {
  RecipeDetailDocument,
  UpdateRecipeDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";
import { useCategoryActions, useRecheckUrl } from "~/lib/import-integrity";

import { useReadQuery } from "@apollo/client/react";
import {
  RecipeDetailPageContent,
  type RecipeUpdateInput,
} from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/recipes/$id")({
  loader: ({ context: { preloadQuery }, params }) => ({
    queryRef: preloadQuery(RecipeDetailDocument, {
      variables: { id: params.id },
    }),
  }),
  head: () => ({ meta: [{ title: "Recipe · Peas" }] }),
  component: RecipeDetailPage,
});

function RecipeDetailPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);

  const categoryActions = useCategoryActions(data.recipe?.noteId ?? "");
  const onRecheckUrl = useRecheckUrl();

  // The effect evicts this recipe and the recipes list, so both refetch.
  const onUpdate = useMutationAction(UpdateRecipeDocument, {
    variables: (input: RecipeUpdateInput) => ({ input }),
    payload: (result) => result.updateRecipe,
  });

  if (!data.recipe) return <NotFoundState />;
  return (
    <RecipeDetailPageContent
      recipe={data.recipe}
      onUpdate={onUpdate}
      onRecheckUrl={onRecheckUrl}
      categoryOptions={data.recipeTaxonomy.categories}
      {...categoryActions}
    />
  );
}

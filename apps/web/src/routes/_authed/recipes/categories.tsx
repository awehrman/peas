import {
  CategoriesPageDocument,
  CreateCategoryDocument,
  UpdateCategoryRuleDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";
import { useCategoryRulePreview } from "~/lib/import-integrity";
import { useTeachActions } from "~/lib/teach";

import { useReadQuery } from "@apollo/client/react";
import { CategoriesPageContent, type CategoryFormInput } from "@peas/features";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/recipes/categories")({
  loader: ({ context: { preloadQuery } }) => ({
    queryRef: preloadQuery(CategoriesPageDocument),
  }),
  head: () => ({ meta: [{ title: "Categories · Peas" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { queryRef } = Route.useLoaderData();
  const { data } = useReadQuery(queryRef);
  const { viewer } = Route.useRouteContext();
  const { onSearchConcepts } = useTeachActions();
  const onPreviewRule = useCategoryRulePreview();

  const onCreate = useMutationAction(CreateCategoryDocument, {
    variables: (input: CategoryFormInput) => ({ input }),
    payload: (result) => result.createCategory,
  });
  const onUpdate = useMutationAction(UpdateCategoryRuleDocument, {
    variables: (id: string, input: CategoryFormInput) => ({ id, input }),
    payload: (result) => result.updateCategoryRule,
  });

  return (
    <CategoriesPageContent
      categories={data.categories}
      onCreate={viewer.isAdmin ? onCreate : undefined}
      onUpdate={viewer.isAdmin ? onUpdate : undefined}
      onSearchConcepts={onSearchConcepts}
      onPreviewRule={onPreviewRule}
    />
  );
}

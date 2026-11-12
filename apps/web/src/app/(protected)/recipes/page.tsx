import { ReactNode } from "react";

import { getRecipeTaxonomyOptions, getRecipesPage } from "@peas/database";
import { RecipesListPageContent } from "@peas/features";

import { getAuthOrRedirect } from "../../../lib/auth/queries/get-auth-or-redirect";
import { promoteCompletedNotesAction } from "../../../lib/recipes/actions/recipe-actions";
import {
  type RawSearchParams,
  getPageParam,
  getSearchParam,
} from "../../../lib/shared/search-params";

export const dynamic = "force-dynamic";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<ReactNode> {
  const { user } = await getAuthOrRedirect();
  const params = await searchParams;

  const filters = {
    query: getSearchParam(params, "q"),
    category: getSearchParam(params, "category"),
    tag: getSearchParam(params, "tag"),
  };

  const [data, options] = await Promise.all([
    getRecipesPage({ ...filters, page: getPageParam(params) }),
    getRecipeTaxonomyOptions(),
  ]);

  return (
    <RecipesListPageContent
      data={data}
      filters={filters}
      options={options}
      onPromoteCompletedNotes={
        user.userType === "ADMIN" ? promoteCompletedNotesAction : undefined
      }
    />
  );
}

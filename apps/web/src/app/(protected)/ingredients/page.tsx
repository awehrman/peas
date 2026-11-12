import { ReactNode } from "react";

import {
  getIngredientCategoryNames,
  getIngredientCounts,
  getIngredientDetail,
  getIngredientSummaries,
} from "@peas/database";
import {
  INGREDIENT_GROUPINGS,
  INGREDIENT_VIEWS,
  IngredientsPageContent,
  groupIngredients,
} from "@peas/features";

import { getAuthOrRedirect } from "../../../lib/auth/queries/get-auth-or-redirect";
import {
  createIngredientAction,
  saveIngredientAction,
  searchIngredientsAction,
} from "../../../lib/ingredients/actions/ingredient-actions";
import {
  type RawSearchParams,
  getEnumParam,
  getSearchParam,
} from "../../../lib/shared/search-params";

export const dynamic = "force-dynamic";

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<ReactNode> {
  await getAuthOrRedirect();
  const params = await searchParams;

  const view = getEnumParam(params, "view", INGREDIENT_VIEWS) ?? "all";
  const grouping = getEnumParam(params, "group", INGREDIENT_GROUPINGS) ?? "name";
  const selectedId = getSearchParam(params, "id");

  const [summaries, counts, selected, categoryOptions] = await Promise.all([
    getIngredientSummaries(view),
    getIngredientCounts(),
    selectedId ? getIngredientDetail(selectedId) : Promise.resolve(null),
    getIngredientCategoryNames(),
  ]);

  return (
    <IngredientsPageContent
      view={view}
      grouping={grouping}
      groups={groupIngredients(summaries, grouping, view)}
      counts={counts}
      selected={selected}
      categoryOptions={categoryOptions}
      onSave={saveIngredientAction}
      onCreate={createIngredientAction}
      onSearch={searchIngredientsAction}
    />
  );
}

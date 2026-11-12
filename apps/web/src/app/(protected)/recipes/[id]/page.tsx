import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getRecipeDetail } from "@peas/database";
import { RecipeDetailPageContent } from "@peas/features";

import { getAuthOrRedirect } from "../../../../lib/auth/queries/get-auth-or-redirect";
import { updateRecipeAction } from "../../../../lib/recipes/actions/recipe-actions";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  await getAuthOrRedirect();
  const { id } = await params;

  const recipe = await getRecipeDetail(id);
  if (!recipe) notFound();

  return <RecipeDetailPageContent recipe={recipe} onUpdate={updateRecipeAction} />;
}

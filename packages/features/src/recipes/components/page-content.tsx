import { ReactNode } from "react";
import { getRecipeCount } from "../actions";

export async function RecipesPageContent(): Promise<ReactNode> {
  const count = await getRecipeCount();
  return <p>{count} Recipes</p>;
}

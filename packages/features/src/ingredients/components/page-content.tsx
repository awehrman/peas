import { ReactNode } from "react";
import { getIngredientCount } from "../actions";

export async function IngredientsPageContent(): Promise<ReactNode> {
  const count = await getIngredientCount();
  return <p>{count} Ingredients</p>;
}

import { ReactNode } from "react";

interface RecipesPageContentProps {
  count: number;
}

export function RecipesPageContent({
  count,
}: RecipesPageContentProps): ReactNode {
  return <p>{count} Recipes</p>;
}

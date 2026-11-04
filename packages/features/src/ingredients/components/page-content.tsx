import { ReactNode } from "react";

interface IngredientsPageContentProps {
  count: number;
}

export function IngredientsPageContent({
  count,
}: IngredientsPageContentProps): ReactNode {
  return <p>{count} Ingredients</p>;
}

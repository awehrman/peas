import { ReactNode } from "react";

import { prisma } from "@peas/database";
import { RecipesPageContent } from "@peas/features";

import { getAuthOrRedirect } from "../../../lib/auth/queries/get-auth-or-redirect";

export const dynamic = "force-dynamic";

export default async function RecipesPage(): Promise<ReactNode> {
  await getAuthOrRedirect();
  // There is no Recipe model yet, so every note counts as a recipe.
  const count = await prisma.note.count();

  return <RecipesPageContent count={count} />;
}

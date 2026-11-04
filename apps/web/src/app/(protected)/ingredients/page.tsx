import { ReactNode } from "react";

import { prisma } from "@peas/database";
import { IngredientsPageContent } from "@peas/features";

import { getAuthOrRedirect } from "../../../lib/auth/queries/get-auth-or-redirect";

export const dynamic = "force-dynamic";

export default async function IngredientsPage(): Promise<ReactNode> {
  await getAuthOrRedirect();
  const count = await prisma.ingredient.count();

  return <IngredientsPageContent count={count} />;
}

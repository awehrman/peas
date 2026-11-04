import { ReactNode } from "react";

import { prisma } from "@peas/database";
import { NotesPageContent } from "@peas/features";

import { getAuthOrRedirect } from "../../../lib/auth/queries/get-auth-or-redirect";

export const dynamic = "force-dynamic";

export default async function NotesPage(): Promise<ReactNode> {
  await getAuthOrRedirect();
  const count = await prisma.note.count();

  return <NotesPageContent count={count} />;
}

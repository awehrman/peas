import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getNoteDetail } from "@peas/database";
import { NoteDetailPageContent } from "@peas/features";

import { getAuthOrRedirect } from "../../../../lib/auth/queries/get-auth-or-redirect";
import { setLineReviewStatusAction } from "../../../../lib/notes/actions/set-line-review-status";
import { createGrammarTestFromLineAction } from "../../../../lib/parser/actions/grammar-test-actions";
import { promoteNoteToRecipeAction } from "../../../../lib/recipes/actions/recipe-actions";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { user } = await getAuthOrRedirect();
  const { id } = await params;

  const note = await getNoteDetail(id);
  if (!note) notFound();

  return (
    <NoteDetailPageContent
      note={note}
      onSetReviewStatus={setLineReviewStatusAction}
      onPromoteToRecipe={promoteNoteToRecipeAction}
      onCreateGrammarTest={
        user.userType === "ADMIN" ? createGrammarTestFromLineAction : undefined
      }
    />
  );
}

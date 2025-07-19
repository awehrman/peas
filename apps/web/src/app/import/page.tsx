import { ReactNode } from "react";
import { ImportPageContent, getImportStats } from "@peas/features";

export const dynamic = "force-dynamic";

export default async function ImportPageRoute(): Promise<ReactNode> {
  const { noteCount, ingredientCount, parsingErrorCount } =
    await getImportStats();

  return (
    <ImportPageContent
      initialNoteCount={noteCount}
      initialIngredientCount={ingredientCount}
      initialParsingErrorCount={parsingErrorCount}
    />
  );
}

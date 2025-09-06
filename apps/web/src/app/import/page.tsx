import { ReactNode } from "react";

import { ImportPage, ImportProvider } from "@peas/features";

export const dynamic = "force-dynamic";

export default async function ImportPageRoute(): Promise<ReactNode> {
  // Using static values for development/testing
  // TODO: Implement getImportStats() to fetch real data from the server
  const initialNoteCount = 0;
  const initialIngredientCount = 0;
  const initialParsingErrorCount = 0;

  return (
    <ImportProvider>
      <ImportPage
        initialNoteCount={initialNoteCount}
        initialIngredientCount={initialIngredientCount}
        initialParsingErrorCount={initialParsingErrorCount}
      />
    </ImportProvider>
  );
}

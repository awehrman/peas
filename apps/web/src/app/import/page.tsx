import { ReactNode } from "react";

import { ImportPage } from "@peas/features";

import { getImportStats } from "./actions/get-import-stats";
import { ImportProviderWithWebSocket } from "./components/import-provider-with-websocket";

export const dynamic = "force-dynamic";

export default async function ImportPageRoute(): Promise<ReactNode> {
  let stats;

  try {
    // Fetch real data from the server using server action
    stats = await getImportStats();
  } catch (error) {
    console.error("Failed to load initial stats:", error);
    // Fallback to default stats if server action fails
    stats = {
      numberOfNotes: 0,
      numberOfIngredients: 0,
      numberOfParsingErrors: 0,
    };
  }

  return (
    <ImportProviderWithWebSocket>
      <ImportPage
        initialNoteCount={stats.numberOfNotes}
        initialIngredientCount={stats.numberOfIngredients}
        initialParsingErrorCount={stats.numberOfParsingErrors}
      />
    </ImportProviderWithWebSocket>
  );
}

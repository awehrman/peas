import { ReactNode } from "react";

import { ImportProvider } from "@peas/features";

import { getQueueToken } from "../../../lib/auth/actions/get-queue-token";

import { getImportStats, refetchImportStats } from "./actions/get-import-stats";
import { ImportPage } from "./components/import-page";

export const dynamic = "force-dynamic";

export default async function ImportPageRoute(): Promise<ReactNode> {
  const { numberOfNotes, numberOfIngredients, numberOfParsingErrors } =
    await getImportStats();

  return (
    <ImportProvider
      onStatsRefresh={refetchImportStats}
      getQueueToken={getQueueToken}
    >
      <ImportPage
        initialNoteCount={numberOfNotes}
        initialIngredientCount={numberOfIngredients}
        initialParsingErrorCount={numberOfParsingErrors}
      />
    </ImportProvider>
  );
}

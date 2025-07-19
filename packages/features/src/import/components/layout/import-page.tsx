"use client";

import { ReactNode } from "react";
import { StatsSummary } from "../dashboard/stats-summary";
import { ActivityLog } from "../activity-log/activity-log";
import { ImportFileUpload } from "../file-upload/file-upload";
import { useIngredientCountUpdater } from "../../hooks/use-ingredient-count-updater";
import { getWebSocketUrl } from "../../../utils/websocket-config";

interface ImportPageContentProps {
  initialNoteCount: number;
  initialIngredientCount: number;
  initialParsingErrorCount: number;
}

export function ImportPageContent({
  initialNoteCount,
  initialIngredientCount,
  initialParsingErrorCount,
}: ImportPageContentProps): ReactNode {
  const { ingredientCount } = useIngredientCountUpdater({
    wsUrl: getWebSocketUrl(),
    initialCount: initialIngredientCount,
  });

  return (
    <>
      <div className="flex justify-between items-start gap-8">
        {/* Left Column */}
        <div className="flex-1 flex flex-col">
          <StatsSummary
            noteCount={initialNoteCount}
            ingredientCount={ingredientCount}
            parsingErrorCount={initialParsingErrorCount}
            className="mb-8"
          />
          <div className="flex-1">
            <ActivityLog className="mb-8" />
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1">
          <ImportFileUpload maxFileSize="10MB" />
        </div>
      </div>
    </>
  );
}

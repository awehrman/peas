"use client";

import { ReactNode } from "react";

import { useImportStatsRefetch } from "../../hooks/use-import-stats-refetch";
import { ActivityLog } from "../activity-log/activity-log";
import { StatsSummary } from "../dashboard/stats-summary";
import { ImportFileUpload } from "../file-upload/file-upload";

export interface ImportStats {
  noteCount: number;
  ingredientCount: number;
  parsingErrorCount: number;
}

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
  // Use the combined hook that handles stats refetching and ingredient count updates
  const { stats } = useImportStatsRefetch({
    initialStats: {
      noteCount: initialNoteCount,
      ingredientCount: initialIngredientCount,
      parsingErrorCount: initialParsingErrorCount,
    },
  });

  return (
    <>
      <div className="flex justify-between items-start gap-8">
        {/* Left Column */}
        <div className="flex-1 flex flex-col">
          <StatsSummary
            noteCount={stats.noteCount}
            ingredientCount={stats.ingredientCount}
            parsingErrorCount={stats.parsingErrorCount}
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

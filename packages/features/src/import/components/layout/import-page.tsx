"use client";

import { ReactNode } from "react";

import {
  ImportStateProvider,
  useImportState,
} from "../../contexts";
import { useImportStatsRefetch } from "../../hooks/use-import-stats-refetch";
import { ActivityLog } from "../activity-log";
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

function ImportPageContentInner({
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

  const { state } = useImportState();
  const { uploadingHtmlFiles } = state;

  return (
    <>
      {/* Top row: Upload + Summary side-by-side on md+; stacked on small */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Upload Files */}
        <div>
          <ImportFileUpload maxFileSize="10MB" className="mb-6" />
        </div>

        {/* Right: Import Summary */}
        <div>
          <StatsSummary
            noteCount={stats.noteCount}
            ingredientCount={stats.ingredientCount}
            parsingErrorCount={stats.parsingErrorCount}
            className="mb-6"
          />
        </div>
      </div>

      {/* Full width Activity Log beneath */}
      <div className="mt-2">
        <ActivityLog
          className="mb-8"
          htmlFiles={uploadingHtmlFiles}
          defaultExpandedFirst={true}
        />
      </div>
    </>
  );
}

export function ImportPageContent(props: ImportPageContentProps): ReactNode {
  return (
    <ImportStateProvider>
      <ImportPageContentInner {...props} />
    </ImportStateProvider>
  );
}

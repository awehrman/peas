"use client";

import {
  ImportActivityList,
  ImportFileUpload,
  useInitialization,
} from "@peas/features";

interface ImportPageProps {
  /** Initial note count from server (defaults to 0) */
  initialNoteCount?: number;
  /** Initial ingredient count from server (defaults to 0) */
  initialIngredientCount?: number;
  /** Initial parsing error count from server (defaults to 0) */
  initialParsingErrorCount?: number;
}

/**
 * Client component for the import page
 */
export function ImportPage({
  initialNoteCount = 0,
  initialIngredientCount = 0,
  initialParsingErrorCount = 0,
}: ImportPageProps) {
  useInitialization({
    initialNoteCount,
    initialIngredientCount,
    initialParsingErrorCount,
  });

  return (
    <div className="container mx-auto p-6">
      <div className="grid gap-6">
        {/* Import Notes Section */}
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Import Notes</h2>
          <ImportFileUpload />
        </div>

        {/* Import Activity Section */}
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <ImportActivityList />
        </div>
      </div>
    </div>
  );
}

"use client";

import { ImportFileUpload, useInitialization } from "@peas/features";

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
        {/* File Upload Section */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">File Upload</h2>
          <ImportFileUpload />
        </div>
      </div>
    </div>
  );
}

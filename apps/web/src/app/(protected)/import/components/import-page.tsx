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
    <div className="grid gap-6">
      <section
        aria-labelledby="import-notes-heading"
        className="bg-card flex max-h-[32rem] flex-col rounded-lg border p-5 shadow-xs"
      >
        <h2 id="import-notes-heading" className="mb-4 text-base font-semibold">
          Import notes
        </h2>
        <ImportFileUpload className="flex min-h-0 flex-1 flex-col" />
      </section>

      <ImportActivityList />
    </div>
  );
}

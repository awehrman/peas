"use client";

import { FileDropZone, cn } from "@peas/components";

import { useFileUpload } from "../hooks/use-file-upload";
import { getUploadError } from "../utils/upload-ui-helpers";

/** Zipped exports, or individual notes and their images */
const ACCEPTED_FILES = ".zip,.html,.htm,image/*";

export interface ImportFileUploadProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether the upload is disabled */
  disabled?: boolean;
}

/** A single-row drop target; per-note upload progress lives in the import overview. */
export function ImportFileUpload({
  className,
  disabled = false,
}: ImportFileUploadProps) {
  const { state, validationError, selectionSummary, isProcessing, handleFilesChange } =
    useFileUpload();

  const error = getUploadError(validationError, state.currentBatch);

  return (
    <section aria-label="Import notes" className={cn("flex flex-col gap-2", className)}>
      <FileDropZone
        variant="compact"
        onFilesChange={handleFilesChange}
        multiple
        allowDirectories
        accept={ACCEPTED_FILES}
        disabled={disabled || isProcessing}
        title="Drop an Evernote export to import notes"
        description="A .zip, a folder, or .html notes with their images"
        error={error}
        isProcessing={isProcessing}
      />

      {selectionSummary ? (
        <p role="status" className="px-1 text-xs text-muted-foreground">
          {selectionSummary}
        </p>
      ) : null}
    </section>
  );
}

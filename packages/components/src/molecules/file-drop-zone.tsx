"use client";

import { FileInput } from "./file-input";
import { Placeholder } from "./placeholder";

import React, { useCallback, useState } from "react";

import { AlertCircle, File, Loader2, Upload } from "lucide-react";

import { collectDroppedFiles } from "../lib/file-paths";
import { cn } from "../lib/utils";
import { Alert, AlertDescription } from "../ui/alert";

export interface FileDropZoneProps {
  /** Callback when files are dropped or selected */
  onFilesChange?: (files: File[]) => void;
  /** Whether to allow multiple files */
  multiple?: boolean;
  /** Whether to allow directory selection */
  allowDirectories?: boolean;
  /** Accepted types for the "Choose files" picker, e.g. ".zip,.html" */
  accept?: string;
  /** Whether the drop zone is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Title for the drop zone */
  title?: string;
  /** Description for the drop zone */
  description?: React.ReactNode;
  /** Error message to display */
  error?: string;
  /** Whether files are currently being processed */
  isProcessing?: boolean;
  /** "compact" lays the zone out as a single row with the title above the description */
  variant?: "default" | "compact";
}

export function FileDropZone({
  onFilesChange,
  multiple = true,
  allowDirectories = true,
  accept,
  disabled = false,
  className,
  title = "Drop files here",
  description = "Drop or choose files",
  error,
  isProcessing = false,
  variant = "default",
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length > 0 && onFilesChange) {
        onFilesChange(files);
      }
    },
    [onFilesChange]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!disabled && !isProcessing) {
        setIsDragOver(true);
      }
    },
    [disabled, isProcessing]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
    },
    []
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);

      if (disabled || isProcessing) return;

      handleFiles(await collectDroppedFiles(event.dataTransfer));
    },
    [disabled, isProcessing, handleFiles]
  );

  const isDisabled = disabled || isProcessing;
  const isActiveDrop = isDragOver && !isDisabled;

  const fileInput = !isProcessing ? (
    <FileInput
      onFilesChange={handleFiles}
      multiple={multiple}
      allowDirectories={allowDirectories}
      accept={accept}
      disabled={isDisabled}
      showInput={true}
    />
  ) : null;

  return (
    <div className={cn("file-drop-zone", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg transition-colors",
          variant === "compact"
            ? "flex flex-col gap-3 bg-card px-4 py-3 sm:flex-row sm:items-center"
            : "px-6 py-2",
          isActiveDrop
            ? "border-primary-400 bg-primary-50"
            : "border-greyscale-200",
          isDisabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-greyscale-300 cursor-pointer"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {variant === "compact" ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600"
                aria-hidden="true"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 motion-safe:animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0" aria-live="polite">
                <p className="text-sm font-medium">
                  {isProcessing
                    ? "Processing files…"
                    : isActiveDrop
                      ? "Release to import"
                      : title}
                </p>
                {description ? (
                  <p className="text-xs text-muted-foreground">{description}</p>
                ) : null}
              </div>
            </div>
            {fileInput}
          </>
        ) : (
          <Placeholder
            icon={
              isProcessing ? (
                <File className="h-8 w-8 text-blue-500" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )
            }
            label={
              isProcessing
                ? "Processing files..."
                : isDragOver
                  ? "Drop files here"
                  : description
            }
            buttonSize="sm"
            button={fileInput}
          />
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4 [&>svg+div]:translate-y-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="leading-4">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

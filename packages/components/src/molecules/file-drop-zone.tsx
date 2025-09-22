"use client";

import { FileInput } from "./file-input";
import { Placeholder } from "./placeholder";

import React, { useCallback, useState } from "react";

import { AlertCircle, File, Upload } from "lucide-react";

import { cn } from "../lib/utils";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";

export interface FileDropZoneProps {
  /** Callback when files are dropped or selected */
  onFilesChange?: (files: File[]) => void;
  /** Whether to allow multiple files */
  multiple?: boolean;
  /** Whether to allow directory selection */
  allowDirectories?: boolean;
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
}

export function FileDropZone({
  onFilesChange,
  multiple = true,
  allowDirectories = true,
  disabled = false,
  className,
  description = "Drop or choose files",
  error,
  isProcessing = false,
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
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);

      if (disabled || isProcessing) return;

      const files = Array.from(event.dataTransfer.files || []);
      handleFiles(files);
    },
    [disabled, isProcessing, handleFiles]
  );

  const isDisabled = disabled || isProcessing;

  return (
    <div className={cn("file-drop-zone", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 transition-colors",
          isDragOver && !isDisabled
            ? "border-blue-400 bg-blue-50"
            : "border-greyscale-100",
          isDisabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-greyscale-200 cursor-pointer"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
          button={
            !isProcessing ? (
              <FileInput
                onFilesChange={handleFiles}
                multiple={multiple}
                allowDirectories={allowDirectories}
                disabled={isDisabled}
                showInput={true}
              />
            ) : null
          }
        />
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

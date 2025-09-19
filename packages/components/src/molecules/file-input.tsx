"use client";

import React from "react";

import { FileInputField } from "../atoms/file-input-field";
import { cn } from "../lib/utils";
import { Button } from "../ui/button-shadcn";

export interface FileInputProps {
  /** Callback when files are selected */
  onFilesChange?: (files: File[]) => void;
  /** Whether to allow multiple files */
  multiple?: boolean;
  /** Whether to allow directory selection */
  allowDirectories?: boolean;
  /** Accepted file types */
  accept?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Input ID for accessibility */
  id?: string;
  /** Whether to show the file input (hidden by default) */
  showInput?: boolean;
}

/**
 * File input molecule component
 * Combines atomic file input fields with button controls
 */
export function FileInput({
  onFilesChange,
  multiple = false,
  allowDirectories = false,
  accept,
  disabled = false,
  className,
  id = "file-input",
  showInput = false,
}: FileInputProps) {
  const openDirectoryDialog = () => {
    document.getElementById(`${id}-directory`)?.click();
  };

  return (
    <div className={cn("file-input", className)}>
      {/* Atomic file input fields */}
      <FileInputField
        id={id}
        onFilesChange={onFilesChange}
        multiple={multiple}
        accept={accept}
        disabled={disabled}
      />

      {/* Show UI controls if requested */}
      {showInput && allowDirectories && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openDirectoryDialog}
            disabled={disabled}
          >
            Choose directory
          </Button>
        </div>
      )}
    </div>
  );
}

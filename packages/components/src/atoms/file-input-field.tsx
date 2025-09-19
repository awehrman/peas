"use client";

import React from "react";

import { cn } from "../lib/utils";

export interface FileInputFieldProps {
  /** Callback when files are selected */
  onFilesChange?: (files: File[]) => void;
  /** Whether to allow multiple files */
  multiple?: boolean;
  /** Accepted file types */
  accept?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Input ID for accessibility */
  id?: string;
}

/**
 * Atomic file input field component
 * Pure input element without any UI chrome
 */
export function FileInputField({
  onFilesChange,
  multiple = false,
  accept,
  disabled = false,
  className,
  id = "file-input-field",
}: FileInputFieldProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0 && onFilesChange) {
      onFilesChange(files);
    }
    // Reset the input value to allow selecting the same files again
    event.target.value = "";
  };

  return (
    <>
      {/* Regular file input */}
      <input
        id={id}
        type="file"
        multiple={multiple}
        onChange={handleFileChange}
        className={cn("hidden", className)}
        accept={accept}
        disabled={disabled}
      />
      {/* Directory input */}
      <input
        id={`${id}-directory`}
        type="file"
        multiple={true}
        {...{ webkitdirectory: "" }}
        onChange={handleFileChange}
        className={cn("hidden", className)}
        accept={accept}
        disabled={disabled}
      />
    </>
  );
}

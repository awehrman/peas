"use client";

import React from "react";

import { cn } from "../lib/utils";

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

export function FileInput({
  onFilesChange,
  multiple = true,
  allowDirectories = false,
  accept,
  disabled = false,
  className,
  id = "file-input",
  showInput = false,
}: FileInputProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0 && onFilesChange) {
      onFilesChange(files);
    }
    // Reset the input value to allow selecting the same files again
    event.target.value = "";
  };

  const openFileDialog = () => {
    document.getElementById(id)?.click();
  };

  const openDirectoryDialog = () => {
    document.getElementById(`${id}-directory`)?.click();
  };

  return (
    <div className={cn("file-input", className)}>
      {/* Hidden file inputs */}
      <input
        id={id}
        type="file"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        disabled={disabled}
      />

      {allowDirectories && (
        <input
          id={`${id}-directory`}
          type="file"
          multiple={true}
          {...{ webkitdirectory: "" }}
          onChange={handleFileChange}
          className="hidden"
          accept={accept}
          disabled={disabled}
        />
      )}

      {/* Show input if requested */}
      {showInput && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openFileDialog}
            disabled={disabled}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Choose files
          </button>
          {allowDirectories && (
            <button
              type="button"
              onClick={openDirectoryDialog}
              disabled={disabled}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose directory
            </button>
          )}
        </div>
      )}
    </div>
  );
}

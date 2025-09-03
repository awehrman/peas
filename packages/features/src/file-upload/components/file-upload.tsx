"use client";

import { Placeholder } from "@peas/components";
import React from "react";
import { Button } from "@peas/components";

export interface FileUploadProps {
  onFilesUpload?: (files: File[]) => void;
  onFileUpload?: (file: File) => void; // Keep for backward compatibility
  title?: string;
  description?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  allowDirectories?: boolean;
}

export function FileUpload({
  onFilesUpload,
  onFileUpload,
  title = "Upload files",
  description = "Drop or choose files",
  className = "",
  disabled = false,
  multiple = true,
  allowDirectories = false,
}: FileUploadProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      if (onFilesUpload && multiple) {
        onFilesUpload(files);
      } else if (onFileUpload && files.length === 1) {
        onFileUpload(files[0]!);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);

    if (files.length > 0) {
      if (onFilesUpload && multiple) {
        onFilesUpload(files);
      } else if (onFileUpload && files.length === 1) {
        onFileUpload(files[0]!);
      }
    }
  };

  const openFileDialog = () => {
    document.getElementById("file-upload")?.click();
  };

  const openDirectoryDialog = () => {
    document.getElementById("directory-upload")?.click();
  };

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <div
        className={`border-2 border-dashed border-gray-300 rounded-lg p-8 transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Placeholder
          icon={null}
          label={description}
          buttonSize="sm"
          button={
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={openFileDialog}
                disabled={disabled}
              >
                Choose files
              </Button>
              {allowDirectories && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openDirectoryDialog}
                  disabled={disabled}
                >
                  Choose directory
                </Button>
              )}
            </div>
          }
        />

        {/* Hidden file inputs */}
        <input
          id="file-upload"
          type="file"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          accept=".html,.htm,.png,.jpg,.jpeg,.gif,.webp,.svg"
        />
        {allowDirectories && (
          <input
            id="directory-upload"
            type="file"
            multiple={true}
            {...({ webkitdirectory: "" } as any)}
            onChange={handleFileChange}
            className="hidden"
            accept=".html,.htm,.png,.jpg,.jpeg,.gif,.webp,.svg"
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { Placeholder } from "./placeholder";

import React, { useState } from "react";

import { FolderOpen, Upload } from "lucide-react";

import { Button } from "../ui/button";

export interface FileUploadProps {
  onFilesUpload?: (files: File[]) => void;
  onFileUpload?: (file: File) => void; // Keep for backward compatibility
  acceptedFileTypes?: string;
  maxFileSize?: string;
  title?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export function FileUpload({
  onFilesUpload,
  onFileUpload,
  acceptedFileTypes = "HTML files and individual image files",
  maxFileSize = "10MB",
  title = "Upload files",
  description = "or drag and drop",
  className = "",
  disabled = false,
  multiple = true,
}: FileUploadProps) {
  const [isDirectoryMode, setIsDirectoryMode] = useState(false);

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

  return (
    <div className={className}>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>

      {/* Mode Toggle */}
      <div className="mb-4 flex gap-2">
        <Button
          variant={!isDirectoryMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsDirectoryMode(false)}
          disabled={disabled}
        >
          <Upload className="w-4 h-4 mr-2" />
          Individual Files
        </Button>
        <Button
          variant={isDirectoryMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsDirectoryMode(true)}
          disabled={disabled}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Directory
        </Button>
      </div>

      <div
        className={`border-2 border-dashed border-gray-300 rounded-lg p-8 transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Placeholder
          label={`${description} ${acceptedFileTypes} up to ${maxFileSize}`}
          icon={isDirectoryMode ? <FolderOpen /> : <Upload />}
          buttonSize="sm"
          button={
            <Button
              variant="default"
              size="sm"
              onClick={openFileDialog}
              disabled={disabled}
            >
              {isDirectoryMode ? "Choose directory" : "Choose files"}
            </Button>
          }
        />
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Note:</strong>{" "}
            {isDirectoryMode
              ? "Select a directory containing image files. All images within the directory will be processed."
              : "You can upload individual HTML and image files."}
          </p>
          <p>
            Supported formats: HTML files (.html, .htm) and image files (.jpg,
            .jpeg, .png, .gif, .webp, .bmp)
          </p>
        </div>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          disabled={disabled}
          multiple={multiple}
          accept=".html,.htm,image/*"
          {...((isDirectoryMode
            ? {
                webkitdirectory: "true",
              }
            : {}) as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      </div>
    </div>
  );
}

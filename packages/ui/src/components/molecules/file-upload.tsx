"use client";
import React from "react";
import { Placeholder } from "./placeholder";
import { Upload } from "lucide-react";
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
  acceptedFileTypes = "HTML files and image folders",
  maxFileSize = "10MB",
  title = "Upload files",
  description = "or drag and drop",
  className = "",
  disabled = false,
  multiple = true,
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

  return (
    <div className={className}>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
      <div
        className={`border-2 border-dashed border-gray-300 rounded-lg p-8 transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Placeholder
          label={`${description} ${acceptedFileTypes} up to ${maxFileSize}`}
          icon={<Upload />}
          buttonSize="sm"
          button={
            <Button
              variant="default"
              size="sm"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={disabled}
            >
              Choose files
            </Button>
          }
        />
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          disabled={disabled}
          multiple={multiple}
          accept=".html,.htm,image/*"
        />
      </div>
    </div>
  );
}

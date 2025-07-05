"use client";
import { ReactNode } from "react";
import Placeholder from "./Placeholder";
import { Upload } from "lucide-react";

export interface FileUploadProps {
  onFileUpload?: (file: File) => void;
  acceptedFileTypes?: string;
  maxFileSize?: string;
  title?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFileUpload,
  acceptedFileTypes = "PDF, DOC, DOCX",
  maxFileSize = "10MB",
  title = "Upload file",
  description = "or drag and drop",
  className = "",
  disabled = false,
}: FileUploadProps): ReactNode {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
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
            <label
              htmlFor="file-upload"
              className={`cursor-pointer bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm ${
                disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              Choose a file
            </label>
          }
        />
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

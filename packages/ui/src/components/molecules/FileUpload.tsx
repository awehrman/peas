import { ReactNode } from "react";

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
  disabled = false
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
        className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <label 
              htmlFor="file-upload" 
              className={`cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors ${
                disabled ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              Choose a file
            </label>
            <input 
              id="file-upload" 
              name="file-upload" 
              type="file" 
              className="sr-only" 
              onChange={handleFileChange}
              disabled={disabled}
            />
            <p className="text-sm text-gray-500 mt-2">{description}</p>
            <p className="text-xs text-gray-400 mt-1">{acceptedFileTypes} up to {maxFileSize}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
"use client";

import { useCallback, useState } from "react";

import { FileUpload } from "@peas/ui";

import { useImportState } from "../../contexts";
import { useOptimizedUpload } from "../../hooks/use-optimized-upload";
import { FileProcessor } from "../../utils/file-processor";

interface Props {
  maxFileSize?: string;
  acceptedFileTypes?: string;
  className?: string;
  onUploadComplete?: (
    results: Array<{ success: boolean; fileName: string; error?: string }>
  ) => void;
}

export function OptimizedFileUpload({ className, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const {
    addUploadingHtmlFiles,
    removeUploadingHtmlFiles,
    setFileTitles,
    clearUploadingHtmlFiles,
    clearFileTitles,
  } = useImportState();

  const { uploadFiles, progress, isUploading, cancelAllUploads } =
    useOptimizedUpload({
      batchSize: 3,
      delayBetweenBatches: 800,
      maxRetries: 3,
      timeoutMs: 25000,
    });

  const fileProcessor = new FileProcessor({
    maxFilesPerBatch: 50,
    enableTitleExtraction: true,
    filterEvernoteIndex: true,
  });

  const handleFilesUpload = useCallback(
    async (files: File[]) => {
      setUploading(true);
      setMessage(null);
      setValidationErrors([]);

      try {
        // Validate files first
        const validation = fileProcessor.validateFiles(files);
        if (!validation.valid) {
          setValidationErrors(validation.errors);
          setMessage("File validation failed. Please check the errors below.");
          return;
        }

        // Process files with memory optimization
        const processingResult = await fileProcessor.processFiles(files);

        // Add HTML files to upload context for activity log
        const htmlFileNames = processingResult.htmlFiles.map(
          (file) => file.name
        );
        addUploadingHtmlFiles(htmlFileNames);

        // Set file titles
        setFileTitles(processingResult.fileTitles);

        // Upload files using optimized upload hook
        const uploadResults = await uploadFiles(
          processingResult.htmlFiles,
          processingResult.htmlToImagesMap
        );

        // Remove uploaded files from context
        removeUploadingHtmlFiles(htmlFileNames);

        // Calculate success/failure statistics
        const successfulUploads = uploadResults.filter(
          (result) => result.success
        );
        const failedUploads = uploadResults.filter((result) => !result.success);

        if (failedUploads.length === 0) {
          setMessage(
            `✅ Successfully uploaded ${successfulUploads.length} files with ${processingResult.totalImageCount} images.`
          );
        } else if (successfulUploads.length === 0) {
          setMessage(`❌ All uploads failed. Please try again.`);
        } else {
          setMessage(
            `⚠️ Uploaded ${successfulUploads.length} files successfully, ${failedUploads.length} failed.`
          );
        }

        // Call completion callback if provided
        if (onUploadComplete) {
          onUploadComplete(uploadResults);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        setMessage(`❌ ${errorMessage}`);

        // Clean up on error
        clearUploadingHtmlFiles();
        clearFileTitles();
      } finally {
        setUploading(false);
      }
    },
    [
      fileProcessor,
      uploadFiles,
      addUploadingHtmlFiles,
      removeUploadingHtmlFiles,
      setFileTitles,
      clearUploadingHtmlFiles,
      clearFileTitles,
      onUploadComplete,
    ]
  );

  const handleCancel = useCallback(() => {
    cancelAllUploads();
    clearUploadingHtmlFiles();
    clearFileTitles();
    setUploading(false);
    setMessage("Upload cancelled");
  }, [cancelAllUploads, clearUploadingHtmlFiles, clearFileTitles]);

  const getProgressMessage = () => {
    if (!isUploading) return null;

    const {
      totalFiles,
      completedFiles,
      failedFiles,
      currentBatch,
      totalBatches,
      overallProgress,
    } = progress;

    if (totalFiles === 0) return "Preparing upload...";

    return `Uploading ${completedFiles + failedFiles}/${totalFiles} files (Batch ${currentBatch}/${totalBatches}) - ${overallProgress}%`;
  };

  return (
    <div className={className}>
      <FileUpload
        onFilesUpload={handleFilesUpload}
        disabled={uploading || isUploading}
        multiple={true}
        allowDirectories={true}
        title="Upload Notes"
        description={
          uploading || isUploading ? (
            <div className="text-center">
              <div className="mb-2">{getProgressMessage()}</div>
              {progress.overallProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.overallProgress}%` }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Cancel Upload
              </button>
            </div>
          ) : (
            "Select HTML files and associated images to upload"
          )
        }
      />

      {message && (
        <div
          className={`mt-4 p-3 rounded ${
            message.includes("✅")
              ? "bg-green-100 text-green-800"
              : message.includes("❌")
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {message}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">
          <h4 className="font-medium mb-2">Validation Errors:</h4>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Memory usage indicator (for debugging) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Memory: {fileProcessor.getMemoryInfo().used}MB used
        </div>
      )}
    </div>
  );
}

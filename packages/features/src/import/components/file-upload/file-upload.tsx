"use client";

import { useState } from "react";

import { FileUpload } from "@peas/ui";

import { useUploadContext } from "../../contexts/upload-context";
import { extractTitlesFromFiles } from "../../utils/extract-title";

declare const fetch: typeof globalThis.fetch;

interface Props {
  maxFileSize?: string;
  acceptedFileTypes?: string;
  className?: string;
}

const QUEUE_API_BASE =
  process.env.NEXT_PUBLIC_QUEUE_API_URL ?? "http://localhost:4200";

export function ImportFileUpload({ className }: Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const {
    addUploadingHtmlFiles,
    removeUploadingHtmlFiles,
    setFileTitles,
    addUploadItem,
    updateUploadItem,
    generateImportId,
    uploadItems,
  } = useUploadContext();

  interface UploadResult {
    htmlFile: string;
    imageCount: number;
    importId: string;
    success: true;
  }

  const handleFilesUpload = async (files: File[]) => {
    setUploading(true);
    setMessage(null);

    try {
      // Check if this is a directory upload by looking for file paths
      const hasDirectoryStructure = files.some(
        (file) =>
          file.webkitRelativePath && file.webkitRelativePath.includes("/")
      );

      // Separate HTML files from other files
      const allHtmlFiles = files.filter(
        (file) =>
          file.type === "text/html" ||
          file.name.endsWith(".html") ||
          file.name.endsWith(".htm")
      );

      // Filter out Evernote_index.html files
      const htmlFiles = allHtmlFiles.filter(
        (file) => file.name !== "Evernote_index.html"
      );

      // All non-HTML files are potential images (including binary files without extensions)
      // The backend will use enhanced detection to determine which are actually images
      const imageFiles = files.filter(
        (file) => !htmlFiles.includes(file) // Exclude HTML files
      );

      if (htmlFiles.length === 0) {
        throw new Error(
          "No HTML files found. Please upload at least one HTML file."
        );
      }

      // Extract titles from HTML files before uploading
      const fileTitles = await extractTitlesFromFiles(htmlFiles);
      setFileTitles(fileTitles);

      // Add HTML files to upload context for activity log
      const htmlFileNames = htmlFiles.map((file) => file.name);
      addUploadingHtmlFiles(htmlFileNames);

      // Group HTML files with their associated images
      if (hasDirectoryStructure) {
        // Create a map to group images by their HTML file
        const htmlToImagesMap = new Map<string, File[]>();

        // Initialize empty arrays for each HTML file
        htmlFiles.forEach((htmlFile) => {
          htmlToImagesMap.set(htmlFile.name, []);
        });

        // Group images by matching their directory structure to HTML files
        imageFiles.forEach((imageFile) => {
          const imagePath = imageFile.webkitRelativePath || imageFile.name;

          // Find which HTML file this image belongs to
          let matchedHtmlFile: string | null = null;

          for (const htmlFile of htmlFiles) {
            const htmlPath = htmlFile.webkitRelativePath || htmlFile.name;
            const htmlDir = htmlPath.split("/")[0]; // Get the base directory

            // Check if the image path contains the HTML file's base directory
            if (imagePath.startsWith(htmlDir + "/")) {
              // Check if the image is in a subdirectory that matches the HTML filename
              const htmlNameWithoutExt = htmlFile.name.replace(
                /\.(html|htm)$/,
                ""
              );
              const imagePathParts = imagePath.split("/");

              // Look for a directory that matches the HTML filename
              for (let i = 1; i < imagePathParts.length - 1; i++) {
                const dirName = imagePathParts[i];
                if (
                  dirName &&
                  (dirName
                    .toLowerCase()
                    .includes(htmlNameWithoutExt.toLowerCase()) ||
                    htmlNameWithoutExt
                      .toLowerCase()
                      .includes(dirName.toLowerCase()))
                ) {
                  matchedHtmlFile = htmlFile.name;
                  break;
                }
              }

              if (matchedHtmlFile) break;
            }
          }

          if (matchedHtmlFile) {
            const imageArray = htmlToImagesMap.get(matchedHtmlFile);
            if (imageArray) {
              imageArray.push(imageFile);
            }
          }
        });

        // Process each HTML file with its associated images in batches
        const batchSize = 5; // Maximum 5 concurrent uploads
        const delayBetweenBatches = 1000; // 1 second delay between batches
        const maxRetries = 3; // Maximum retry attempts per upload

        const uploadFile = async (
          htmlFile: File,
          index: number,
          retryCount = 0
        ): Promise<UploadResult> => {
          // Generate import ID for this HTML/image pair
          const importId = generateImportId();
          const currentBatch = Math.floor(index / batchSize) + 1;
          const totalBatches = Math.ceil(htmlFiles.length / batchSize);

          // Add to upload context immediately
          addUploadItem({
            importId,
            htmlFileName: htmlFile.name,
            imageCount: htmlToImagesMap.get(htmlFile.name)?.length || 0,
            status: "uploading",
            createdAt: new Date(),
            batchProgress: {
              currentBatch,
              totalBatches,
              currentFile: index + 1,
              totalFiles: htmlFiles.length,
            },
          });

          try {
            // Create FormData for this HTML file and its associated images
            const formData = new FormData();
            formData.append("html", htmlFile);

            // Add associated images
            htmlToImagesMap.get(htmlFile.name)?.forEach((imageFile) => {
              formData.append("images", imageFile);
            });

            // Add metadata including the frontend-generated import ID
            formData.append("importId", importId);
            formData.append("uploadIndex", index.toString());
            formData.append("totalUploads", htmlFiles.length.toString());
            formData.append("htmlFileName", htmlFile.name);
            formData.append(
              "associatedImageCount",
              htmlToImagesMap.get(htmlFile.name)?.length.toString() || "0"
            );

            // Add timeout to prevent stuck uploads
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(`${QUEUE_API_BASE}/upload`, {
              method: "POST",
              body: formData,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              // Check if it's a rate limit error
              if (response.status === 429) {
                if (retryCount < maxRetries) {
                  // Wait before retrying (exponential backoff)
                  const waitTime = Math.pow(2, retryCount) * 1000;
                  await new Promise((resolve) => setTimeout(resolve, waitTime));
                  return uploadFile(htmlFile, index, retryCount + 1);
                } else {
                  updateUploadItem(importId, { status: "failed" });
                  throw new Error(
                    `Upload failed for ${htmlFile.name}: Rate limit exceeded after ${maxRetries} retries`
                  );
                }
              } else {
                updateUploadItem(importId, { status: "failed" });
                throw new Error(
                  `Upload failed for ${htmlFile.name}: ${response.statusText}`
                );
              }
            }

            // Update status to uploaded
            updateUploadItem(importId, { status: "uploaded" });

            return {
              htmlFile: htmlFile.name,
              imageCount: htmlToImagesMap.get(htmlFile.name)?.length || 0,
              importId,
              success: true,
            };
          } catch (error) {
            // Handle timeout and network errors
            if (error instanceof Error) {
              if (error.name === "AbortError") {
                console.error(`Upload timeout for ${htmlFile.name}`);
                updateUploadItem(importId, { status: "failed" });
                throw new Error(`Upload timeout for ${htmlFile.name}`);
              }
            }

            // Ensure the upload item is marked as failed
            updateUploadItem(importId, { status: "failed" });
            throw error;
          }
        };

        // Process uploads in batches
        const allResults: UploadResult[] = [];
        const failedResults: Error[] = [];

        for (let i = 0; i < htmlFiles.length; i += batchSize) {
          const batch = htmlFiles.slice(i, i + batchSize);
          const batchIndexes = Array.from(
            { length: batch.length },
            (_, j) => i + j
          );

          // Process current batch
          const batchPromises: Promise<UploadResult>[] = batch.map(
            (htmlFile, batchIndex) =>
              uploadFile(htmlFile, batchIndexes[batchIndex] || 0)
          );

          const batchResults =
            await Promise.allSettled<UploadResult>(batchPromises);

          // Collect results
          batchResults.forEach((result, batchIndex) => {
            if (result.status === "fulfilled") {
              allResults.push(result.value);
            } else {
              const reason =
                result.reason instanceof Error
                  ? result.reason
                  : new Error(String(result.reason));
              failedResults.push(reason);
              const fileName = batch[batchIndex]?.name || "Unknown file";
              console.error(
                `❌ [UPLOAD_DEBUG] Batch upload failed for ${fileName}:`,
                reason
              );
            }
          });

          // Add delay between batches (except for the last batch)
          if (i + batchSize < htmlFiles.length) {
            await new Promise((resolve) =>
              setTimeout(resolve, delayBetweenBatches)
            );
          }
        }

        const successfulResults = allResults;
        const totalImages = successfulResults.reduce(
          (sum, result) => sum + result.imageCount,
          0
        );
        const successfulUploads = successfulResults.length;

        if (failedResults.length > 0) {
          // Some uploads failed
          const errorMessages = failedResults.map((error) => {
            const msg = (error as Error).message;
            return typeof msg === "string" && msg.length > 0
              ? msg
              : "Unknown error";
          });
          const totalErrors = errorMessages.length;

          // Truncate error messages if there are too many or they're too long
          let errorMessage: string = "Unknown error";
          if (totalErrors === 1) {
            errorMessage = errorMessages[0] ?? "Unknown error";
          } else if (totalErrors > 1 && totalErrors <= 3) {
            errorMessage = errorMessages.join("; ");
          } else if (totalErrors > 3) {
            errorMessage = `${errorMessages.slice(0, 2).join("; ")} and ${totalErrors - 2} more errors`;
          }

          // Truncate very long error messages
          if (errorMessage.length > 200) {
            errorMessage = errorMessage.substring(0, 200) + "...";
          }

          setMessage(
            `Upload completed with errors. ${successfulUploads}/${htmlFiles.length} files uploaded successfully. Errors: ${errorMessage}`
          );
        } else {
          // All uploads succeeded
          setMessage(
            `Uploaded ${successfulUploads} HTML file${htmlFiles.length > 1 ? "(s)" : ""} with ${totalImages} associated image${totalImages > 1 ? "(s)" : ""} from directory structure.`
          );
        }

        // Final cleanup: Check for any stuck uploads and mark them as failed
        setTimeout(() => {
          const stuckUploads = Array.from(uploadItems.entries()).filter(
            ([_, item]) =>
              item.status === "uploading" &&
              item.createdAt < new Date(Date.now() - 60000) // Older than 1 minute
          );

          if (stuckUploads.length > 0) {
            console.warn(
              "🚨 [UPLOAD_DEBUG] Found stuck uploads:",
              stuckUploads.map(([id, _item]) => ({
                importId: id,
                fileName: _item.htmlFileName,
                createdAt: _item.createdAt,
              }))
            );

            stuckUploads.forEach(([importId, _item]) => {
              updateUploadItem(importId, { status: "failed" });
            });
          }
        }, 5000); // Check after 5 seconds
      } else {
        // For non-directory uploads, create a single import ID for all files
        const importId = generateImportId();
        const maxRetries = 3;

        // Add to upload context
        addUploadItem({
          importId,
          htmlFileName: htmlFiles.map((f) => f.name).join(", "),
          imageCount: imageFiles.length,
          status: "uploading",
          createdAt: new Date(),
        });

        const uploadNonDirectory = async (retryCount = 0): Promise<void> => {
          try {
            const formData = new FormData();

            // Add HTML files
            htmlFiles.forEach((file) => {
              formData.append("html", file);
            });

            // Add image files
            imageFiles.forEach((file) => {
              formData.append("images", file);
            });

            // Add the frontend-generated import ID
            formData.append("importId", importId);

            const response = await fetch(`${QUEUE_API_BASE}/upload`, {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              // Check if it's a rate limit error
              if (response.status === 429) {
                if (retryCount < maxRetries) {
                  // Wait before retrying (exponential backoff)
                  const waitTime = Math.pow(2, retryCount) * 1000;
                  await new Promise((resolve) => setTimeout(resolve, waitTime));
                  return uploadNonDirectory(retryCount + 1);
                } else {
                  updateUploadItem(importId, { status: "failed" });
                  throw new Error(
                    `Upload failed: Rate limit exceeded after ${maxRetries} retries`
                  );
                }
              } else {
                updateUploadItem(importId, { status: "failed" });
                throw new Error(`Upload failed: ${response.statusText}`);
              }
            }

            updateUploadItem(importId, { status: "uploaded" });
          } catch (error) {
            updateUploadItem(importId, { status: "failed" });
            throw error;
          }
        };

        await uploadNonDirectory();

        setMessage(
          `Uploaded ${htmlFiles.length} HTML file${htmlFiles.length > 1 ? "(s)" : ""} and ${imageFiles.length} image file${imageFiles.length > 1 ? "(s)" : ""}.`
        );
      }

      // Remove HTML files from upload context after successful upload
      removeUploadingHtmlFiles(htmlFileNames);
    } catch (error) {
      console.error("[FRONTEND] Upload error:", error);
      setMessage(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );

      // Remove HTML files from upload context on error
      const htmlFileNames = files
        .filter(
          (file) =>
            file.type === "text/html" ||
            file.name.endsWith(".html") ||
            file.name.endsWith(".htm")
        )
        .filter((file) => file.name !== "Evernote_index.html")
        .map((file) => file.name);
      removeUploadingHtmlFiles(htmlFileNames);

      // Note: We don't remove upload items here because they should show as failed
      // The cleanup mechanism in the context will handle removing old items
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <FileUpload
        onFilesUpload={handleFilesUpload}
        description={
          message ? (
            <div
              className={
                message.includes("failed")
                  ? "text-red-700 bg-red-50 px-4 py-2 rounded-md mb-4"
                  : "text-green-700 bg-green-50 px-4 py-2 rounded-md mb-4"
              }
            >
              {message}
            </div>
          ) : (
            "Drop files here or choose files"
          )
        }
        disabled={uploading}
        multiple={true}
        allowDirectories={true}
      />
    </div>
  );
}

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

export function ImportFileUpload({
  maxFileSize = "10MB",
  acceptedFileTypes = "HTML files and individual image files",
  className,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { 
    addUploadingHtmlFiles, 
    removeUploadingHtmlFiles, 
    setFileTitles,
    addUploadItem,
    updateUploadItem,
    generateImportId
  } = useUploadContext();

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

        // Process each HTML file with its associated images
        const uploadPromises = htmlFiles.map(async (htmlFile, index) => {
          const associatedImages = htmlToImagesMap.get(htmlFile.name) || [];
          
          // Generate import ID for this HTML/image pair
          const importId = generateImportId();
          
          // Add to upload context immediately
          addUploadItem({
            importId,
            htmlFileName: htmlFile.name,
            imageCount: associatedImages.length,
            status: "uploading",
            createdAt: new Date(),
          });

          try {
            // Create FormData for this HTML file and its associated images
            const formData = new FormData();
            formData.append("html", htmlFile);

            // Add associated images
            associatedImages.forEach((imageFile) => {
              formData.append("images", imageFile);
            });

            // Add metadata including the frontend-generated import ID
            formData.append("importId", importId);
            formData.append("uploadIndex", index.toString());
            formData.append("totalUploads", htmlFiles.length.toString());
            formData.append("htmlFileName", htmlFile.name);
            formData.append(
              "associatedImageCount",
              associatedImages.length.toString()
            );

            const response = await fetch(`${QUEUE_API_BASE}/upload`, {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              // Update status to failed
              updateUploadItem(importId, { status: "failed" });
              throw new Error(`Upload failed for ${htmlFile.name}: ${response.statusText}`);
            }

            // Update status to uploaded
            updateUploadItem(importId, { status: "uploaded" });

            return {
              htmlFile: htmlFile.name,
              imageCount: associatedImages.length,
              importId,
              success: true,
            };
          } catch (error) {
            // Ensure the upload item is marked as failed
            updateUploadItem(importId, { status: "failed" });
            throw error;
          }
        });

        // Wait for all uploads to complete
        const results = await Promise.allSettled(uploadPromises);

        const successfulResults = results
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value);
        
        const failedResults = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => result.reason);

        const totalImages = successfulResults.reduce(
          (sum, result) => sum + result.imageCount,
          0
        );
        const successfulUploads = successfulResults.length;

        if (failedResults.length > 0) {
          // Some uploads failed
          const errorMessages = failedResults.map(error => error.message);
          const totalErrors = errorMessages.length;
          
          // Truncate error messages if there are too many or they're too long
          let errorMessage: string;
          if (totalErrors === 1) {
            errorMessage = errorMessages[0];
          } else if (totalErrors <= 3) {
            errorMessage = errorMessages.join('; ');
          } else {
            errorMessage = `${errorMessages.slice(0, 2).join('; ')} and ${totalErrors - 2} more errors`;
          }
          
          // Truncate very long error messages
          if (errorMessage.length > 200) {
            errorMessage = errorMessage.substring(0, 200) + '...';
          }
          
          setMessage(
            `Upload completed with errors. ${successfulUploads}/${htmlFiles.length} files uploaded successfully. Errors: ${errorMessage}`
          );
        } else {
          // All uploads succeeded
          setMessage(
            `Successfully uploaded ${successfulUploads} HTML file(s) with ${totalImages} associated image(s) from directory structure. Processing started.`
          );
        }
      } else {
        // For non-directory uploads, create a single import ID for all files
        const importId = generateImportId();
        
        // Add to upload context
        addUploadItem({
          importId,
          htmlFileName: htmlFiles.map(f => f.name).join(", "),
          imageCount: imageFiles.length,
          status: "uploading",
          createdAt: new Date(),
        });

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
          updateUploadItem(importId, { status: "failed" });
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        updateUploadItem(importId, { status: "uploaded" });

        setMessage(
          `Successfully uploaded ${htmlFiles.length} HTML file(s) and ${imageFiles.length} image file(s). Processing started.`
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
        maxFileSize={maxFileSize}
        acceptedFileTypes={acceptedFileTypes}
        disabled={uploading}
        multiple={true}
        allowDirectories={true}
      />
      {message && (
        <div className="mt-4 p-3 rounded text-sm">
          {message.includes("failed") ? (
            <div className="text-red-700 bg-red-50 border border-red-200 p-2">
              {message}
            </div>
          ) : (
            <div className="text-green-700 bg-green-50 border border-green-200 p-2">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

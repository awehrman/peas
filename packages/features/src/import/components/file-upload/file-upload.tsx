"use client";

import { useState } from "react";

import { FileUpload } from "@peas/ui";

import { useUploadContext } from "../../context/upload-context";

// Declare fetch for TypeScript
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
  const { addUploadingHtmlFiles, removeUploadingHtmlFiles } =
    useUploadContext();

  const handleFilesUpload = async (files: File[]) => {
    setUploading(true);
    setMessage(null);

    try {
      console.log("[FRONTEND] Starting file upload process");
      console.log("[FRONTEND] Total files received:", files.length);

      // Check if this is a directory upload by looking for file paths
      const hasDirectoryStructure = files.some(
        (file) =>
          file.webkitRelativePath && file.webkitRelativePath.includes("/")
      );

      if (hasDirectoryStructure) {
        console.log("[FRONTEND] Directory upload detected");
        console.log(
          "[FRONTEND] File paths:",
          files.map((f) => f.webkitRelativePath)
        );
      }

      // Separate HTML files from other files
      const allHtmlFiles = files.filter(
        (file) =>
          file.type === "text/html" ||
          file.name.endsWith(".html") ||
          file.name.endsWith(".htm")
      );

      // Filter out Evernote_index.html files
      const htmlFiles = allHtmlFiles.filter((file) => {
        const shouldIgnore = file.name === "Evernote_index.html";
        if (shouldIgnore) {
          console.log(`[FRONTEND] Ignoring Evernote index file: ${file.name}`);
        }
        return !shouldIgnore;
      });

      if (allHtmlFiles.length !== htmlFiles.length) {
        console.log(
          `[FRONTEND] Filtered out ${allHtmlFiles.length - htmlFiles.length} Evernote index files`
        );
      }

      // All non-HTML files are potential images (including binary files without extensions)
      // The backend will use enhanced detection to determine which are actually images
      const imageFiles = files.filter(
        (file) => !htmlFiles.includes(file) // Exclude HTML files
      );

      console.log("[FRONTEND] HTML files found:", htmlFiles.length);
      console.log("[FRONTEND] Image files found:", imageFiles.length);

      if (htmlFiles.length === 0) {
        throw new Error(
          "No HTML files found. Please upload at least one HTML file."
        );
      }

      // Add HTML files to upload context for activity log
      const htmlFileNames = htmlFiles.map((file) => file.name);
      addUploadingHtmlFiles(htmlFileNames);

      // NEW APPROACH: Group HTML files with their associated images
      if (hasDirectoryStructure) {
        console.log("[FRONTEND] Processing directory upload with grouping...");

        // Create a map to group images by their HTML file
        const htmlToImagesMap = new Map<string, File[]>();

        // Initialize empty arrays for each HTML file
        htmlFiles.forEach((htmlFile) => {
          htmlToImagesMap.set(htmlFile.name, []);
        });

        // Group images by matching their directory structure to HTML files
        imageFiles.forEach((imageFile) => {
          const imagePath = imageFile.webkitRelativePath || imageFile.name;
          console.log(
            `[FRONTEND] Processing image: ${imageFile.name} with path: ${imagePath}`
          );

          // Find which HTML file this image belongs to
          let matchedHtmlFile: string | null = null;

          for (const htmlFile of htmlFiles) {
            const htmlPath = htmlFile.webkitRelativePath || htmlFile.name;
            const htmlDir = htmlPath.split("/")[0]; // Get the base directory

            console.log(
              `[FRONTEND] Checking if image ${imageFile.name} belongs to HTML ${htmlFile.name} (dir: ${htmlDir})`
            );

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
                  console.log(
                    `[FRONTEND] ✅ MATCH: Image ${imageFile.name} matches HTML ${htmlFile.name} via directory ${dirName}`
                  );
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
              console.log(
                `[FRONTEND] 🔗 Associated image ${imageFile.name} with HTML file ${matchedHtmlFile}`
              );
            }
          } else {
            console.log(
              `[FRONTEND] ❌ NO MATCH: Image ${imageFile.name} could not be matched to any HTML file`
            );
          }
        });

        console.log(
          "[FRONTEND] HTML to images mapping:",
          Array.from(htmlToImagesMap.entries()).map(([htmlFile, images]) => ({
            htmlFile,
            count: images.length,
            images: images.map((f) => f.name),
          }))
        );

        // Process each HTML file with its associated images
        const uploadPromises = htmlFiles.map(async (htmlFile, index) => {
          console.log(
            `[FRONTEND] Processing HTML file ${index + 1}/${htmlFiles.length}: ${htmlFile.name}`
          );

          const associatedImages = htmlToImagesMap.get(htmlFile.name) || [];

          // Create FormData for this HTML file and its associated images
          const formData = new FormData();
          formData.append("html", htmlFile);

          // Add associated images
          associatedImages.forEach((imageFile) => {
            formData.append("images", imageFile);
          });

          // Add metadata
          formData.append("uploadIndex", index.toString());
          formData.append("totalUploads", htmlFiles.length.toString());
          formData.append("htmlFileName", htmlFile.name);
          formData.append(
            "associatedImageCount",
            associatedImages.length.toString()
          );

          console.log(
            `[FRONTEND] Uploading ${htmlFile.name} with ${associatedImages.length} associated images`
          );

          const response = await fetch(`${QUEUE_API_BASE}/upload`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const result = await response.json();
          console.log(`[FRONTEND] Upload result for ${htmlFile.name}:`, result);

          return {
            htmlFile: htmlFile.name,
            imageCount: associatedImages.length,
            importId: result.data.importId,
            success: true,
          };
        });

        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises);

        const totalImages = results.reduce(
          (sum, result) => sum + result.imageCount,
          0
        );
        const successfulUploads = results.filter((r) => r.success).length;

        console.log(
          `[FRONTEND] All uploads completed: ${successfulUploads}/${htmlFiles.length} successful`
        );
        console.log(`[FRONTEND] Total images processed: ${totalImages}`);

        setMessage(
          `Successfully uploaded ${successfulUploads} HTML file(s) with ${totalImages} associated image(s) from directory structure. Processing started.`
        );
      } else {
        // For non-directory uploads, use the old approach
        console.log("[FRONTEND] Processing single file upload...");

        const formData = new FormData();

        // Add HTML files
        htmlFiles.forEach((file) => {
          formData.append("html", file);
        });

        // Add image files
        imageFiles.forEach((file) => {
          formData.append("images", file);
        });

        const response = await fetch(`${QUEUE_API_BASE}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("[FRONTEND] Upload result:", result);

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
            <div className="text-red-700 bg-red-50 border border-red-200">
              {message}
            </div>
          ) : (
            <div className="text-green-700 bg-green-50 border border-green-200">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

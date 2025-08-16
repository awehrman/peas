"use client";

import { useState } from "react";

import { FileUpload } from "@peas/ui";

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

          // Find associated images for this HTML file
          const associatedImages = htmlToImagesMap.get(htmlFile.name) || [];
          console.log(
            `[FRONTEND] Found ${associatedImages.length} associated images for ${htmlFile.name}:`,
            associatedImages.map((img) => img.name)
          );

          // Create FormData for this HTML file and its images
          const formData = new FormData();

          // Add the HTML file
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
            `[FRONTEND] Uploading ${htmlFile.name} with ${associatedImages.length} images...`
          );

          const response = await fetch(`${QUEUE_API_BASE}/upload`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Upload failed for ${htmlFile.name}: ${response.status} ${response.statusText} - ${errorText}`
            );
          }

          const result = await response.json();
          console.log(
            `[FRONTEND] Upload successful for ${htmlFile.name}:`,
            result
          );

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
        console.log("[FRONTEND] Processing non-directory upload...");

        // Create FormData for unified upload (HTML + images together)
        const formData = new FormData();

        // Add HTML files
        htmlFiles.forEach((file) => {
          formData.append("html", file);
        });

        // Add image files
        imageFiles.forEach((file) => {
          formData.append("images", file);
        });

        console.log(
          `[FRONTEND] Sending ${htmlFiles.length} HTML files and ${imageFiles.length} image files to /upload`
        );

        const response = await fetch(`${QUEUE_API_BASE}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const result = await response.json();
        console.log("[FRONTEND] Upload successful:", result);

        setMessage(
          `Successfully uploaded ${htmlFiles.length} HTML file(s) and ${imageFiles.length} image file(s). Processing started.`
        );
      }
    } catch (error) {
      console.error("[FRONTEND] Upload error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    handleFilesUpload([file]);
  };

  return (
    <div className={className}>
      <FileUpload
        onFilesUpload={handleFilesUpload}
        onFileUpload={handleFileUpload}
        maxFileSize={maxFileSize}
        acceptedFileTypes={acceptedFileTypes}
        disabled={uploading}
        multiple={true}
        allowDirectories={true}
      />
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
}

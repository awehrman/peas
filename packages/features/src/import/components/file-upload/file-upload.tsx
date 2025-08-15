"use client";

import { useState } from "react";

import { FileUpload } from "@peas/ui";

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
      console.log(
        "[FRONTEND] HTML files:",
        htmlFiles.map((f) => ({
          name: f.name,
          path: f.webkitRelativePath || f.name,
        }))
      );
      console.log(
        "[FRONTEND] Image files:",
        imageFiles.map((f) => ({
          name: f.name,
          path: f.webkitRelativePath || f.name,
        }))
      );

      if (htmlFiles.length === 0) {
        throw new Error(
          "No HTML files found. Please upload at least one HTML file."
        );
      }

      // Create FormData for unified upload (HTML + images together)
      const formData = new FormData();

      // Add HTML files with their paths if available
      htmlFiles.forEach((file) => {
        formData.append("html", file);
        if (file.webkitRelativePath) {
          formData.append("htmlPaths", file.webkitRelativePath);
        }
      });

      // Add image files with their paths if available
      imageFiles.forEach((file) => {
        formData.append("images", file);
        if (file.webkitRelativePath) {
          formData.append("imagePaths", file.webkitRelativePath);
        }
      });

      // Add flag to indicate if this is a directory upload
      if (hasDirectoryStructure) {
        formData.append("isDirectoryUpload", "true");
      }

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

      const uploadType = hasDirectoryStructure ? "directory" : "files";
      setMessage(
        `Successfully uploaded ${htmlFiles.length} HTML file(s) and ${imageFiles.length} image file(s) from ${uploadType}. Processing started.`
      );
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

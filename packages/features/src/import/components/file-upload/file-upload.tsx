"use client";

import { isFromDirectory, isWebkitFile } from "./types";

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
  acceptedFileTypes = "HTML files and image folders",
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

      // Log the first few characters of each file's webkitRelativePath to see what we're getting
      files.forEach((f, index) => {
        if (isWebkitFile(f) && f.webkitRelativePath) {
          console.log(
            `[FRONTEND] File ${index} webkitRelativePath: "${f.webkitRelativePath}" (length: ${f.webkitRelativePath.length})`
          );
        } else {
          console.log(
            `[FRONTEND] File ${index} has no webkitRelativePath or is not a webkit file`
          );
        }
      });

      // Test if any files have webkitRelativePath (indicating directory upload)
      const hasDirectoryUpload = files.some(isFromDirectory);
      console.log("[FRONTEND] Directory upload detected:", hasDirectoryUpload);

      if (hasDirectoryUpload) {
        console.log("[FRONTEND] Directory upload files:");
        files.forEach((f, index) => {
          if (isWebkitFile(f) && f.webkitRelativePath) {
            console.log(
              `[FRONTEND] File ${index}: ${f.name} -> ${f.webkitRelativePath}`
            );
          }
        });
      }

      // Separate HTML files from other files (directories and images)
      const htmlFiles = files.filter(
        (file) =>
          file.type === "text/html" ||
          file.name.endsWith(".html") ||
          file.name.endsWith(".htm")
      );

      // Get all non-HTML files (these could be directories or images)
      const nonHtmlFiles = files.filter(
        (file) =>
          file.type !== "text/html" &&
          !file.name.endsWith(".html") &&
          !file.name.endsWith(".htm")
      );

      console.log("[FRONTEND] HTML files found:", htmlFiles.length);
      console.log("[FRONTEND] Non-HTML files found:", nonHtmlFiles.length);
      console.log(
        "[FRONTEND] HTML files:",
        htmlFiles.map((f) => f.name)
      );
      console.log(
        "[FRONTEND] Non-HTML files:",
        nonHtmlFiles.map((f) => ({
          name: f.name,
          webkitRelativePath: isWebkitFile(f)
            ? f.webkitRelativePath
            : undefined,
        }))
      );

      if (htmlFiles.length === 0) {
        throw new Error(
          "No HTML files found. Please upload at least one HTML file."
        );
      }

      // Create FormData for unified upload (HTML + images together)
      const formData = new FormData();

      // Add all HTML files
      for (const htmlFile of htmlFiles) {
        console.log(
          `[FRONTEND] Adding HTML file to FormData: ${htmlFile.name}`
        );
        formData.append("files", htmlFile);
      }

      // Process image files - handle both individual files and directory uploads
      const imageFiles: File[] = [];

      for (const file of nonHtmlFiles) {
        console.log(
          `[FRONTEND] Processing non-HTML file: ${file.name} (type: ${file.type}, size: ${file.size})`
        );

        // Check if this is a file from a directory upload
        const webkitRelativePath = isWebkitFile(file)
          ? file.webkitRelativePath
          : undefined;
        if (webkitRelativePath) {
          console.log(
            `[FRONTEND] File has webkitRelativePath: ${webkitRelativePath}`
          );
        }

        const isImage =
          file.type.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name);

        console.log(
          `[FRONTEND] Image detection - isImage: ${isImage}, type: ${file.type}, name: ${file.name}`
        );

        if (isImage) {
          imageFiles.push(file);
          console.log(`[FRONTEND] Adding image file to FormData: ${file.name}`);
        } else if (file.type === "" && file.size < 1000) {
          // This is likely a directory object (not a file from directory upload)
          console.log(`[FRONTEND] Found directory object: ${file.name}`);
        } else {
          console.log(
            `[FRONTEND] Skipping non-image file: ${file.name} (type: ${file.type})`
          );
        }
      }

      // Add all image files to FormData
      for (const imageFile of imageFiles) {
        formData.append("files", imageFile);
      }

      console.log(
        `[FRONTEND] Final FormData entries:`,
        Array.from(formData.entries()).map(([key, value]) => [
          key,
          value instanceof File
            ? `${value.name} (${value.type}, ${value.size} bytes)`
            : value,
        ])
      );

      console.log(
        `[FRONTEND] Sending ${htmlFiles.length} HTML files and ${imageFiles.length} image files to /upload`
      );
      console.log(
        `[FRONTEND] FormData entries:`,
        Array.from(formData.entries()).map(([key, value]) => [
          key,
          value instanceof File ? value.name : value,
        ])
      );

      // Send unified upload request
      const res = await globalThis.fetch(`${QUEUE_API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      console.log(`[FRONTEND] /upload response status: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[FRONTEND] /upload error response:", errorText);
        throw new Error(`Queue API responded ${res.status}: ${errorText}`);
      }

      const result = await res.json();
      console.log("[FRONTEND] /upload response:", result);

      setMessage(
        `Files uploaded successfully! Import ID: ${result.data.importId}. Processed ${result.data.htmlFiles} HTML files and ${result.data.imageFiles} images.`
      );
    } catch (err) {
      console.error("[FRONTEND] Upload error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessage(`Upload failed: ${msg}`);
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
      />
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
}

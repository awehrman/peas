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
      console.log(
        "[FRONTEND] Files:",
        files.map((f) => ({ name: f.name, type: f.type, size: f.size }))
      );

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
        nonHtmlFiles.map((f) => f.name)
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

      // Add all image files (filter out directories)
      const imageFiles = nonHtmlFiles.filter(
        (file) =>
          file.type.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)
      );

      for (const imageFile of imageFiles) {
        console.log(
          `[FRONTEND] Adding image file to FormData: ${imageFile.name}`
        );
        formData.append("files", imageFile);
      }

      // Check for directories and warn user
      const directories = nonHtmlFiles.filter(
        (file) => file.type === "" && file.size < 1000
      );

      if (directories.length > 0) {
        console.log(
          `[FRONTEND] Found ${directories.length} directories:`,
          directories.map((d) => d.name)
        );
        console.log(
          `[FRONTEND] Note: Directories cannot be processed directly. Only individual image files will be processed.`
        );
      }

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

      if (directories.length > 0) {
        setMessage(
          `Files uploaded successfully! Import ID: ${result.data.importId}. Note: ${directories.length} directories were skipped - please select individual image files from directories.`
        );
      } else {
        setMessage(
          `Files uploaded successfully! Import ID: ${result.data.importId}. Processed ${result.data.htmlFiles} HTML files and ${result.data.imageFiles} images.`
        );
      }
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

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

      // Process HTML files first
      for (const htmlFile of htmlFiles) {
        console.log(`[FRONTEND] Processing HTML file: ${htmlFile.name}`);
        const content = await readFileAsText(htmlFile);
        console.log(
          `[FRONTEND] HTML content length: ${content.length} characters`
        );

        const requestBody = {
          content,
          imageFiles: nonHtmlFiles.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        };

        console.log(
          "[FRONTEND] Sending HTML to /notes with body:",
          requestBody
        );

        // Use globalThis.fetch to avoid "fetch is not defined" error in environments where fetch is not globally available
        const res = await globalThis.fetch(`${QUEUE_API_BASE}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`[FRONTEND] /notes response status: ${res.status}`);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("[FRONTEND] /notes error response:", errorText);
          throw new Error(`Queue API responded ${res.status}: ${errorText}`);
        }

        const result = await res.json();
        console.log("[FRONTEND] /notes response:", result);

        // If we have non-HTML files (directories or images), upload them
        if (nonHtmlFiles.length > 0) {
          console.log(
            `[FRONTEND] Uploading ${nonHtmlFiles.length} non-HTML files`
          );

          // Check if any of the files are directories
          const directories = nonHtmlFiles.filter(
            (file) => file.type === "" && file.size < 1000
          );
          if (directories.length > 0) {
            console.log(
              `[FRONTEND] Found ${directories.length} directories:`,
              directories.map((d) => d.name)
            );
            setMessage(
              `Note: Directories cannot be processed directly. Please select individual image files from the directories. Processing HTML file only.`
            );
          } else {
            await uploadImages(result.importId, nonHtmlFiles);
            setMessage(
              `Files queued successfully! Import ID: ${result.importId}`
            );
          }
        } else {
          console.log("[FRONTEND] No non-HTML files to upload");
          setMessage(
            `Files queued successfully! Import ID: ${result.importId}`
          );
        }
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

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          resolve(content);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const uploadImages = async (importId: string, files: File[]) => {
    console.log(`[FRONTEND] uploadImages called with importId: ${importId}`);
    console.log(
      `[FRONTEND] Files to upload:`,
      files.map((f) => f.name)
    );

    const formData = new FormData();
    formData.append("importId", importId);

    // Process each file - if it's a directory, we need to handle it specially
    for (const file of files) {
      console.log(
        `[FRONTEND] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`
      );

      if (file.type === "" && file.size < 1000) {
        // This is likely a directory - we can't directly access its contents from the browser
        // For now, we'll send the directory info and let the backend handle it
        console.log(`[FRONTEND] Detected directory: ${file.name}`);
        formData.append("directories", file.name);
      } else if (
        file.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)
      ) {
        // This is an image file
        console.log(`[FRONTEND] Appending image to FormData: ${file.name}`);
        formData.append("images", file);
      } else {
        // This is some other file type
        console.log(
          `[FRONTEND] Appending other file to FormData: ${file.name}`
        );
        formData.append("files", file);
      }
    }

    console.log(`[FRONTEND] Sending FormData to ${QUEUE_API_BASE}/images`);
    console.log(`[FRONTEND] FormData entries:`, Array.from(formData.entries()));

    const res = await globalThis.fetch(`${QUEUE_API_BASE}/images`, {
      method: "POST",
      body: formData,
    });

    console.log(`[FRONTEND] /images response status: ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[FRONTEND] /images error response:", errorText);
      throw new Error(`Image upload failed: ${res.status}: ${errorText}`);
    }

    const result = await res.json();
    console.log("[FRONTEND] /images response:", result);
    return result;
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

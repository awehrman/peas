"use client";

import { FileUpload } from "@peas/ui";
import { useState } from "react";

interface Props {
  maxFileSize?: string;
  acceptedFileTypes?: string;
  className?: string;
}

const QUEUE_API_BASE =
  process.env.NEXT_PUBLIC_QUEUE_API_URL ?? "http://localhost:4200";

export function FileUploadWithQueue({
  maxFileSize = "10MB",
  acceptedFileTypes = "HTML",
  className,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    setUploading(true);
    setMessage(null);

    reader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content !== "string") {
        setMessage("Failed to read file");
        setUploading(false);
        return;
      }

      try {
        const res = await fetch(`${QUEUE_API_BASE}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          throw new Error(`Queue API responded ${res.status}`);
        }
        setMessage("File queued successfully!");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setMessage(`Upload failed: ${msg}`);
      } finally {
        setUploading(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className={className}>
      <FileUpload
        onFileUpload={handleFileUpload}
        maxFileSize={maxFileSize}
        acceptedFileTypes={acceptedFileTypes}
        disabled={uploading}
      />
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
}

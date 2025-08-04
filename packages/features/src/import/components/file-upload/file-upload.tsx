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
      // Separate HTML files from image files
      const htmlFiles = files.filter(file => 
        file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')
      );
      const imageFiles = files.filter(file => 
        file.type.startsWith('image/') || 
        /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)
      );

      if (htmlFiles.length === 0) {
        throw new Error('No HTML files found. Please upload at least one HTML file.');
      }

      // Process HTML files first
      for (const htmlFile of htmlFiles) {
        const content = await readFileAsText(htmlFile);
        
        const res = await fetch(`${QUEUE_API_BASE}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            content,
            imageFiles: imageFiles.map(file => ({
              name: file.name,
              type: file.type,
              size: file.size
            }))
          }),
        });

        if (!res.ok) {
          throw new Error(`Queue API responded ${res.status}`);
        }

        const result = await res.json();
        
        // If we have image files, upload them
        if (imageFiles.length > 0) {
          await uploadImages(result.importId, imageFiles);
        }

        setMessage(`Files queued successfully! Import ID: ${result.importId}`);
      }
    } catch (err) {
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

  const uploadImages = async (importId: string, imageFiles: File[]) => {
    const formData = new FormData();
    formData.append('importId', importId);
    
    imageFiles.forEach((file, index) => {
      formData.append(`images`, file);
    });

    const res = await fetch(`${QUEUE_API_BASE}/images`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Image upload failed: ${res.status}`);
    }

    return res.json();
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

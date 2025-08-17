"use client";

import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";

interface UploadItem {
  importId: string;
  htmlFileName: string;
  imageCount: number;
  status: "uploading" | "uploaded" | "failed";
  createdAt: Date;
}

interface UploadContextType {
  uploadingHtmlFiles: string[];
  fileTitles: Map<string, string>; // Map of filename to extracted title
  uploadItems: Map<string, UploadItem>; // Map of importId to UploadItem
  addUploadingHtmlFiles: (files: string[]) => void;
  removeUploadingHtmlFiles: (files: string[]) => void;
  clearUploadingHtmlFiles: () => void;
  setFileTitles: (titles: Map<string, string>) => void;
  clearFileTitles: () => void;
  addUploadItem: (item: UploadItem) => void;
  updateUploadItem: (importId: string, updates: Partial<UploadItem>) => void;
  removeUploadItem: (importId: string) => void;
  clearUploadItems: () => void;
  generateImportId: () => string;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export function UploadProvider({ children }: UploadProviderProps): ReactNode {
  const [uploadingHtmlFiles, setUploadingHtmlFiles] = useState<string[]>([]);
  const [fileTitles, setFileTitles] = useState<Map<string, string>>(new Map());
  const [uploadItems, setUploadItems] = useState<Map<string, UploadItem>>(new Map());

  const addUploadingHtmlFiles = (files: string[]) => {
    setUploadingHtmlFiles((prev) => [...prev, ...files]);
  };

  const removeUploadingHtmlFiles = (files: string[]) => {
    setUploadingHtmlFiles((prev) =>
      prev.filter((file) => !files.includes(file))
    );
  };

  const clearUploadingHtmlFiles = () => {
    setUploadingHtmlFiles([]);
  };

  const clearFileTitles = () => {
    setFileTitles(new Map());
  };

  const addUploadItem = (item: UploadItem) => {
    setUploadItems((prev) => new Map(prev).set(item.importId, item));
  };

  const updateUploadItem = (importId: string, updates: Partial<UploadItem>) => {
    setUploadItems((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(importId);
      if (existing) {
        newMap.set(importId, { ...existing, ...updates });
      }
      return newMap;
    });
  };

  const removeUploadItem = (importId: string) => {
    setUploadItems((prev) => {
      const newMap = new Map(prev);
      newMap.delete(importId);
      return newMap;
    });
  };

  const clearUploadItems = () => {
    setUploadItems(new Map());
  };

  const generateImportId = (): string => {
    // Use Date.now() with microsecond precision and random string to reduce collision risk
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substr(2, 9);
    const random2 = Math.random().toString(36).substr(2, 9);
    return `import_${timestamp}_${random1}_${random2}`;
  };

  // Clean up old upload items (older than 1 hour)
  const cleanupOldUploadItems = useCallback(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    setUploadItems((prev) => {
      const newMap = new Map(prev);
      let hasChanges = false;
      for (const [importId, item] of newMap.entries()) {
        if (item.createdAt < oneHourAgo) {
          newMap.delete(importId);
          hasChanges = true;
        }
      }
      return hasChanges ? newMap : prev;
    });
  }, []);

  // Mark stuck uploads as failed (stuck in "uploading" for more than 5 minutes)
  const markStuckUploadsAsFailed = useCallback(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    setUploadItems((prev) => {
      const newMap = new Map(prev);
      let hasChanges = false;
      for (const [importId, item] of newMap.entries()) {
        if (item.status === "uploading" && item.createdAt < fiveMinutesAgo) {
          newMap.set(importId, { ...item, status: "failed" });
          hasChanges = true;
        }
      }
      return hasChanges ? newMap : prev;
    });
  }, []);

  // Auto-cleanup every 30 minutes
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupOldUploadItems, 30 * 60 * 1000);
    const timeoutInterval = setInterval(markStuckUploadsAsFailed, 2 * 60 * 1000); // Check every 2 minutes
    return () => {
      clearInterval(cleanupInterval);
      clearInterval(timeoutInterval);
    };
  }, [cleanupOldUploadItems, markStuckUploadsAsFailed]);

  return (
    <UploadContext.Provider
      value={{
        uploadingHtmlFiles,
        fileTitles,
        uploadItems,
        addUploadingHtmlFiles,
        removeUploadingHtmlFiles,
        clearUploadingHtmlFiles,
        setFileTitles,
        clearFileTitles,
        addUploadItem,
        updateUploadItem,
        removeUploadItem,
        clearUploadItems,
        generateImportId,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadContext(): UploadContextType {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUploadContext must be used within an UploadProvider");
  }
  return context;
}

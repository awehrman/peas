"use client";

import { ReactNode, createContext, useContext, useState } from "react";

interface UploadContextType {
  uploadingHtmlFiles: string[];
  fileTitles: Map<string, string>; // Map of filename to extracted title
  addUploadingHtmlFiles: (files: string[]) => void;
  removeUploadingHtmlFiles: (files: string[]) => void;
  clearUploadingHtmlFiles: () => void;
  setFileTitles: (titles: Map<string, string>) => void;
  clearFileTitles: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export function UploadProvider({ children }: UploadProviderProps): ReactNode {
  const [uploadingHtmlFiles, setUploadingHtmlFiles] = useState<string[]>([]);
  const [fileTitles, setFileTitles] = useState<Map<string, string>>(new Map());

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

  return (
    <UploadContext.Provider
      value={{
        uploadingHtmlFiles,
        fileTitles,
        addUploadingHtmlFiles,
        removeUploadingHtmlFiles,
        clearUploadingHtmlFiles,
        setFileTitles,
        clearFileTitles,
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

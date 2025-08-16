"use client";

import { ReactNode, createContext, useContext, useState } from "react";

interface UploadContextType {
  uploadingHtmlFiles: string[];
  addUploadingHtmlFiles: (files: string[]) => void;
  removeUploadingHtmlFiles: (files: string[]) => void;
  clearUploadingHtmlFiles: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export function UploadProvider({ children }: UploadProviderProps): ReactNode {
  const [uploadingHtmlFiles, setUploadingHtmlFiles] = useState<string[]>([]);

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

  return (
    <UploadContext.Provider
      value={{
        uploadingHtmlFiles,
        addUploadingHtmlFiles,
        removeUploadingHtmlFiles,
        clearUploadingHtmlFiles,
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

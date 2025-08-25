"use client";

import { useCallback, useRef, useState } from "react";

// Add global type declarations for browser APIs
declare global {
  interface Window {
    fetch: typeof fetch;
    performance: Performance;
  }
}

import { useImportState } from "../contexts/import-state-context";
import { PerformanceMonitor } from "../utils/performance-monitor";

interface UploadConfig {
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  timeoutMs: number;
  maxConcurrentUploads: number;
}

interface UploadProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentBatch: number;
  totalBatches: number;
  isUploading: boolean;
  overallProgress: number;
}

interface OptimizedUploadResult {
  success: boolean;
  importId: string;
  fileName: string;
  error?: string;
}

const DEFAULT_CONFIG: UploadConfig = {
  batchSize: 3, // Reduced from 5 for better memory management
  delayBetweenBatches: 800, // Reduced from 1000ms
  maxRetries: 3,
  timeoutMs: 25000, // Reduced from 30000ms
  maxConcurrentUploads: 2, // Limit concurrent uploads to prevent overwhelming
};

const QUEUE_API_BASE =
  process.env.NEXT_PUBLIC_QUEUE_API_URL ?? "http://localhost:4200";

export function useOptimizedUpload(config: Partial<UploadConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const {
    addUploadItem,
    updateUploadItem,
    generateImportId,
  } = useImportState();

  const [progress, setProgress] = useState<UploadProgress>({
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    currentBatch: 0,
    totalBatches: 0,
    isUploading: false,
    overallProgress: 0,
  });

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const isUploadingRef = useRef(false);
  const performanceMonitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor());

  const uploadSingleFile = useCallback(
    async (
      htmlFile: File,
      associatedImages: File[],
      index: number,
      retryCount = 0
    ): Promise<OptimizedUploadResult> => {
      const importId = generateImportId();
      const currentBatch = Math.floor(index / mergedConfig.batchSize) + 1;
      const totalBatches = Math.ceil(progress.totalFiles / mergedConfig.batchSize);

      // Create abort controller for this upload
      const controller = new AbortController();
      abortControllersRef.current.set(importId, controller);

      // Add to upload context immediately
      addUploadItem({
        importId,
        htmlFileName: htmlFile.name,
        imageCount: associatedImages.length,
        status: "uploading",
        createdAt: new Date(),
        batchProgress: {
          currentBatch,
          totalBatches,
          currentFile: index + 1,
          totalFiles: progress.totalFiles,
        },
        abortController: controller,
      });

      try {
        // Create FormData with optimized structure
        const formData = new FormData();
        formData.append("html", htmlFile);
        
        // Add images in chunks to prevent memory issues
        const imageChunkSize = 10;
        for (let i = 0; i < associatedImages.length; i += imageChunkSize) {
          const chunk = associatedImages.slice(i, i + imageChunkSize);
          chunk.forEach((imageFile) => {
            formData.append("images", imageFile);
          });
        }

        // Add metadata
        formData.append("importId", importId);
        formData.append("uploadIndex", index.toString());
        formData.append("totalUploads", progress.totalFiles.toString());
        formData.append("htmlFileName", htmlFile.name);
        formData.append(
          "associatedImageCount",
          associatedImages.length.toString()
        );

        // Set timeout
        const timeoutId = setTimeout(() => controller.abort(), mergedConfig.timeoutMs);

        const response = await fetch(`${QUEUE_API_BASE}/upload`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        abortControllersRef.current.delete(importId);

        if (!response.ok) {
          if (response.status === 429 && retryCount < mergedConfig.maxRetries) {
            // Exponential backoff for rate limiting
            const waitTime = Math.pow(2, retryCount) * 1000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            return uploadSingleFile(htmlFile, associatedImages, index, retryCount + 1);
          } else {
            updateUploadItem(importId, { status: "failed" });
            return {
              success: false,
              importId,
              fileName: htmlFile.name,
              error: `Upload failed: ${response.statusText}`,
            };
          }
        }

        updateUploadItem(importId, { status: "uploaded" });
        return {
          success: true,
          importId,
          fileName: htmlFile.name,
        };
      } catch (error) {
        abortControllersRef.current.delete(importId);
        
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            updateUploadItem(importId, { status: "failed" });
            return {
              success: false,
              importId,
              fileName: htmlFile.name,
              error: "Upload timeout",
            };
          }
        }

        updateUploadItem(importId, { status: "failed" });
        return {
          success: false,
          importId,
          fileName: htmlFile.name,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [mergedConfig, progress.totalFiles, addUploadItem, updateUploadItem, generateImportId]
  );

  const uploadBatch = useCallback(
    async (
      batch: Array<{ htmlFile: File; associatedImages: File[] }>,
      batchIndex: number
    ): Promise<OptimizedUploadResult[]> => {
      const batchPromises = batch.map((item, batchItemIndex) => {
        const globalIndex = batchIndex * mergedConfig.batchSize + batchItemIndex;
        return uploadSingleFile(item.htmlFile, item.associatedImages, globalIndex);
      });

      // Use Promise.allSettled for better error handling
      const results = await Promise.allSettled(batchPromises);
      
      return results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          const fileName = batch[index]?.htmlFile.name || "Unknown file";
          return {
            success: false,
            importId: generateImportId(),
            fileName,
            error: result.reason instanceof Error ? result.reason.message : "Unknown error",
          };
        }
      });
    },
    [uploadSingleFile, mergedConfig.batchSize, generateImportId]
  );

  const uploadFiles = useCallback(
    async (
      htmlFiles: File[],
      htmlToImagesMap: Map<string, File[]>
    ): Promise<OptimizedUploadResult[]> => {
      if (isUploadingRef.current) {
        throw new Error("Upload already in progress");
      }

      isUploadingRef.current = true;
      
      // Start performance monitoring
      const totalFileSize = htmlFiles.reduce((sum, file) => sum + file.size, 0);
      performanceMonitorRef.current.startMonitoring(htmlFiles.length, totalFileSize);
      
      // Reset progress
      const totalFiles = htmlFiles.length;
      const totalBatches = Math.ceil(totalFiles / mergedConfig.batchSize);
      
      setProgress({
        totalFiles,
        completedFiles: 0,
        failedFiles: 0,
        currentBatch: 0,
        totalBatches,
        isUploading: true,
        overallProgress: 0,
      });

      const allResults: OptimizedUploadResult[] = [];
      let completedFiles = 0;
      let failedFiles = 0;

      try {
        // Process files in batches
        for (let i = 0; i < htmlFiles.length; i += mergedConfig.batchSize) {
          const batch = htmlFiles.slice(i, i + mergedConfig.batchSize).map(htmlFile => ({
            htmlFile,
            associatedImages: htmlToImagesMap.get(htmlFile.name) || [],
          }));

          const batchIndex = Math.floor(i / mergedConfig.batchSize);
          const batchStartTime = performance.now();
          
          // Update current batch
          setProgress(prev => ({
            ...prev,
            currentBatch: batchIndex + 1,
          }));

          // Upload batch
          const batchResults = await uploadBatch(batch, batchIndex);
          allResults.push(...batchResults);

          // Record batch performance
          const batchEndTime = performance.now();
          const successfulInBatch = batchResults.filter(result => result.success).length;
          const failedInBatch = batchResults.filter(result => !result.success).length;
          performanceMonitorRef.current.recordBatch(
            batchIndex,
            batchStartTime,
            batchEndTime,
            batch.length,
            successfulInBatch,
            failedInBatch
          );

          // Update progress
          batchResults.forEach(result => {
            if (result.success) {
              completedFiles++;
            } else {
              failedFiles++;
            }
          });

          setProgress(prev => ({
            ...prev,
            completedFiles,
            failedFiles,
            overallProgress: Math.round(((completedFiles + failedFiles) / totalFiles) * 100),
          }));

          // Add delay between batches (except for the last batch)
          if (i + mergedConfig.batchSize < htmlFiles.length) {
            await new Promise((resolve) => 
              setTimeout(resolve, mergedConfig.delayBetweenBatches)
            );
          }
        }

        return allResults;
      } finally {
        // Stop performance monitoring
        performanceMonitorRef.current.stopMonitoring();
        
        isUploadingRef.current = false;
        setProgress(prev => ({
          ...prev,
          isUploading: false,
        }));
      }
    },
    [uploadBatch, mergedConfig.batchSize, mergedConfig.delayBetweenBatches]
  );

  const cancelUpload = useCallback((importId: string) => {
    const controller = abortControllersRef.current.get(importId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(importId);
    }
  }, []);

  const cancelAllUploads = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    isUploadingRef.current = false;
    setProgress(prev => ({
      ...prev,
      isUploading: false,
    }));
  }, []);

  return {
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    progress,
    isUploading: progress.isUploading,
  };
}

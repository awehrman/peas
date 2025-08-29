"use client";

import { useCallback, useState } from "react";
import { extractTitleFromHTML } from "../utils/extract-title";
import { NoteProcessingState, NoteProcessingResult, NoteProcessingOptions } from "../types/note-processing";

export interface UseNoteProcessingOptions {
  autoProcess?: boolean;
  onSuccess?: (result: NoteProcessingResult) => void;
  onError?: (error: string) => void;
}

export interface UseNoteProcessingReturn {
  state: NoteProcessingState;
  processNote: (content: string, options?: NoteProcessingOptions) => Promise<NoteProcessingResult>;
  processNoteFromFile: (file: File, options?: NoteProcessingOptions) => Promise<NoteProcessingResult>;
  reset: () => void;
}

export function useNoteProcessing(options: UseNoteProcessingOptions = {}): UseNoteProcessingReturn {
  const [state, setState] = useState<NoteProcessingState>({
    isProcessing: false,
    currentStep: "idle",
    progress: 0,
  });

  const processNote = useCallback(async (
    content: string,
    processingOptions: NoteProcessingOptions = {}
  ): Promise<NoteProcessingResult> => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      currentStep: "processing",
      progress: 0,
      error: undefined,
    }));

    try {
      // Step 1: Extract title if requested
      let title = "Untitled Note";
      if (processingOptions.extractTitle) {
        setState(prev => ({
          ...prev,
          currentStep: "extracting_title",
          progress: 25,
        }));

        const titleResult = extractTitleFromHTML(content);
        if (titleResult.success) {
          title = titleResult.title;
        }
      }

      // Step 2: Validate content if requested
      if (processingOptions.validateContent) {
        setState(prev => ({
          ...prev,
          currentStep: "validating_content",
          progress: 50,
        }));

        // Basic validation - check if content is not empty
        if (!content.trim()) {
          throw new Error("Note content cannot be empty");
        }
      }

      // Step 3: Process the note (simulated for now)
      setState(prev => ({
        ...prev,
        currentStep: "saving_note",
        progress: 75,
      }));

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Complete
      setState(prev => ({
        ...prev,
        currentStep: "completed",
        progress: 100,
        isProcessing: false,
      }));

      const result: NoteProcessingResult = {
        success: true,
        title,
        metadata: processingOptions.metadata,
      };

      options.onSuccess?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: "error",
        error: errorMessage,
      }));

      options.onError?.(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [options]);

  const processNoteFromFile = useCallback(async (
    file: File,
    processingOptions: NoteProcessingOptions = {}
  ): Promise<NoteProcessingResult> => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      currentStep: "reading_file",
      progress: 0,
      error: undefined,
    }));

    try {
      // Read file content
      const content = await file.text();
      
      setState(prev => ({
        ...prev,
        currentStep: "file_loaded",
        progress: 10,
      }));

      // Process the note with the file content
      return await processNote(content, processingOptions);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to read file";
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: "error",
        error: errorMessage,
      }));

      options.onError?.(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [processNote, options]);

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      currentStep: "idle",
      progress: 0,
      error: undefined,
      noteId: undefined,
    });
  }, []);

  return {
    state,
    processNote,
    processNoteFromFile,
    reset,
  };
}

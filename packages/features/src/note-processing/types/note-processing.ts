export interface NoteProcessingConfig {
  autoProcess?: boolean;
  extractTitle?: boolean;
  validateContent?: boolean;
  className?: string;
}

export interface NoteProcessingState {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  error?: string;
  noteId?: string;
}

export interface NoteProcessingResult {
  success: boolean;
  noteId?: string;
  title?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface NoteProcessingOptions {
  extractTitle?: boolean;
  validateContent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface NoteContent {
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface NoteValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

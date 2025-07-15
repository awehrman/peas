export interface ImageJobData {
  noteId: string;
  file: {
    content: string;
    title?: string;
  };
}

export interface ImageProcessingStep {
  name: string;
  description: string;
  estimatedDuration: number;
}

export interface ImageProcessingResult {
  success: boolean;
  imageUrl?: string;
  errorCount: number;
  totalSteps: number;
  completedSteps: number;
}

export interface ImageWorkerDependencies {
  prisma: any;
  addStatusEventAndBroadcast: (event: any) => Promise<void>;
  ErrorHandler: {
    withErrorHandling: (fn: () => Promise<any>, context: any) => Promise<any>;
    logError: (error: any) => void;
    shouldRetry: (error: any, retryCount: number) => boolean;
    calculateBackoff: (retryCount: number) => number;
    createJobError: (
      error: Error | string,
      type: any,
      severity: any,
      context: any
    ) => any;
    classifyError: (error: Error) => any;
    validateJobData: (data: any, requiredFields: string[]) => any;
  };
  HealthMonitor: {
    getInstance: () => any;
  };
}

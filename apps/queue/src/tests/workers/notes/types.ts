import { Job, Queue, Worker } from "bullmq";
import { vi } from "vitest";

// Logger types with proper mock typing
export interface TestLogger {
  log: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

// Error handler types with mocked functions
export interface TestErrorHandler {
  createJobError: ReturnType<typeof vi.fn>;
  logError: ReturnType<typeof vi.fn>;
  withErrorHandling: ReturnType<typeof vi.fn>;
  shouldRetry: ReturnType<typeof vi.fn>;
  calculateBackoff: ReturnType<typeof vi.fn>;
  classifyError: ReturnType<typeof vi.fn>;
  validateJobData: ReturnType<typeof vi.fn>;
}

export interface TestErrorHandlerClass {
  createJobError: ReturnType<typeof vi.fn>;
  logError: ReturnType<typeof vi.fn>;
}

// Health monitor with mocked methods
export interface TestHealthMonitor {
  isHealthy: ReturnType<typeof vi.fn>;
}

// Queue types using Partial<Queue> for better type safety
export type TestQueue = Partial<Queue> & {
  name: string;
  add: ReturnType<typeof vi.fn>;
};

// Data types
export interface TestNote {
  id: string;
  title?: string;
}

export interface TestFile {
  title: string;
  content?: string;
}

// Worker dependencies with proper mock typing
export interface TestWorkerDependencies {
  parseHTML: ReturnType<typeof vi.fn>;
  createNote: ReturnType<typeof vi.fn>;
  addStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  ErrorHandler: TestErrorHandler;
  HealthMonitor: {
    getInstance: ReturnType<typeof vi.fn>;
  };
  ingredientQueue: TestQueue;
  instructionQueue: TestQueue;
  imageQueue: TestQueue;
  categorizationQueue: TestQueue;
  logger?: TestLogger;
}

// Job type extending Partial<Job> for better type safety
export type TestJob = Partial<Job> & {
  id: string;
  attemptsMade?: number;
  data: Record<string, unknown>;
};

// Test setup with proper mock typing
export interface TestSetup {
  queue: TestQueue;
  job: TestJob;
  logSpy: ReturnType<typeof vi.spyOn>;
  errorSpy: ReturnType<typeof vi.spyOn>;
  originalConsoleLog: typeof console.log;
  originalConsoleError: typeof console.error;
}

// Sub-queues type
export interface TestSubQueues {
  ingredientQueue: TestQueue;
  instructionQueue: TestQueue;
  imageQueue: TestQueue;
  categorizationQueue: TestQueue;
}

// Custom logger type for tests
export interface TestCustomLogger {
  log: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

// Worker type for testing
export type TestWorker = Partial<Worker> & {
  name: string;
  on: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

// Utility types for better type safety
export type MockedObject<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<typeof vi.fn>
    : T[K] extends object
      ? MockedObject<T[K]>
      : T[K];
};

// Specific mock types for common patterns
export type MockedQueue = MockedObject<Queue>;
export type MockedJob = MockedObject<Job>;
export type MockedWorker = MockedObject<Worker>;

// Type for job data
export interface TestJobData {
  content: string;
  [key: string]: unknown;
}

// Type for status events
export interface TestStatusEvent {
  noteId: string;
  status: string;
  message: string;
  context: string;
  [key: string]: unknown;
}

// Type for error context
export interface TestErrorContext {
  jobId: string;
  queueName: string;
  retryCount: number;
  operation: string;
  [key: string]: unknown;
}

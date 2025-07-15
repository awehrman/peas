import { vi } from "vitest";
import { ErrorType, ErrorSeverity } from "../../types";

// --- BullMQ Worker Mock Setup ---
export let capturedProcessFn: ((job: any) => Promise<any>) | null = null;
export let capturedListeners: Record<
  string,
  Array<(...args: any[]) => any>
> = {};

export function setupBullMQWorkerMock() {
  capturedProcessFn = null;
  capturedListeners = {};

  vi.mock("bullmq", () => {
    return {
      Worker: class MockWorker {
        static lastInstance: any;
        name: string;
        opts: any;
        constructor(
          name: string,
          processFn: (job: any) => Promise<any>,
          opts: any
        ) {
          this.name = name;
          this.opts = opts;
          capturedProcessFn = processFn;
          capturedListeners = {};
          MockWorker.lastInstance = this;
        }
        on(event: string, listener: (...args: any[]) => any) {
          if (!capturedListeners[event]) {
            capturedListeners[event] = [];
          }
          capturedListeners[event]!.push(listener);
          return this;
        }
        close() {
          // Mock close method
          return Promise.resolve();
        }
      },
      Queue: class {},
    };
  });
}

// --- Common Mocks ---
export const mockWithErrorHandling = vi.fn();
export const mockLogError = vi.fn();
export const mockShouldRetry = vi.fn();
export const mockCalculateBackoff = vi.fn();
export const mockCreateJobError = vi.fn();
export const mockClassifyError = vi.fn();
export const mockAddStatusEventAndBroadcast = vi.fn();

// Mock ErrorHandler
export const mockValidateJobData = vi.fn();

// Patch: Mock both named exports and ErrorHandler static methods
class ErrorHandlerMock {
  static withErrorHandling = mockWithErrorHandling;
  static logError = mockLogError;
  static shouldRetry = mockShouldRetry;
  static calculateBackoff = mockCalculateBackoff;
  static createJobError = mockCreateJobError;
  static classifyError = mockClassifyError;
  static validateJobData = mockValidateJobData;
}

vi.mock("../../utils/error-handler", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    ...actual,
    withErrorHandling: mockWithErrorHandling,
    logError: mockLogError,
    shouldRetry: mockShouldRetry,
    calculateBackoff: mockCalculateBackoff,
    createJobError: mockCreateJobError,
    classifyError: mockClassifyError,
    validateJobData: mockValidateJobData, // standalone function
    ErrorHandler: ErrorHandlerMock,
    QueueError: actual.QueueError, // <-- ensure QueueError is available
  };
});

// Mock HealthMonitor
export const mockHealthMonitor = {
  isHealthy: vi.fn(),
};

vi.mock("../../utils/health-monitor", () => ({
  HealthMonitor: {
    getInstance: vi.fn(() => mockHealthMonitor),
  },
}));

// Mock Prisma
export const mockPrisma = {
  parsedInstructionLine: {
    update: vi.fn(),
  },
  note: {
    create: vi.fn(),
  },
  createNote: vi.fn(),
};

vi.mock("@peas/database", () => ({
  prisma: mockPrisma,
  createNote: vi.fn().mockResolvedValue({ id: 1, title: "Test Note" }),
}));

// Mock parsers
export const mockParseHTML = vi.fn();
vi.mock("../../parsers/html", () => ({
  parseHTML: mockParseHTML,
}));

// Mock status broadcaster
vi.mock("../../utils/status-broadcaster", () => ({
  addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
}));

// --- Shared Test Setup ---
export interface WorkerTestSetup {
  queue: any;
  job: any;
  logSpy: any;
  errorSpy: any;
  originalConsoleLog: any;
  originalConsoleError: any;
}

export function setupWorkerTestEnvironment(): WorkerTestSetup {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  const queue = { name: "test-queue" };
  const job = {
    id: "job1",
    attemptsMade: 0,
    data: { content: "<html>...</html>" },
  };

  // Reset all mocks
  vi.clearAllMocks();

  // Setup default mock implementations
  mockHealthMonitor.isHealthy.mockResolvedValue(true);
  mockWithErrorHandling.mockImplementation(async (fn) => {
    // Track that withErrorHandling was called
    return await fn();
  });
  mockShouldRetry.mockReturnValue(false);
  mockCalculateBackoff.mockReturnValue(1000);
  mockValidateJobData.mockReturnValue(null);
  mockCreateJobError.mockImplementation((error, type, severity, context) => {
    const message = typeof error === "string" ? error : error.message;
    return {
      message,
      type,
      severity,
      ...(context || {}), // <-- ensure context is always an object
      timestamp: new Date(),
    };
  });
  mockClassifyError.mockImplementation((err) => ({
    message: err.message,
    type: ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.CRITICAL,
  }));

  return {
    queue,
    job,
    logSpy,
    errorSpy,
    originalConsoleLog,
    originalConsoleError,
  };
}

export function cleanupWorkerTestEnvironment(setup: WorkerTestSetup) {
  setup.logSpy.mockRestore();
  setup.errorSpy.mockRestore();
  console.log = setup.originalConsoleLog;
  console.error = setup.originalConsoleError;
  capturedProcessFn = null;
  capturedListeners = {};
}

// --- Common Test Helpers ---
export function createMockJob(overrides: any = {}) {
  return {
    id: "job1",
    attemptsMade: 0,
    data: { content: "<html>...</html>" },
    ...overrides,
  };
}

export function createMockQueue(overrides: any = {}) {
  return {
    name: "test-queue",
    ...overrides,
  };
}

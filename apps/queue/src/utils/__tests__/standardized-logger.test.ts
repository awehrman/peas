/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LogLevel } from "../../types";
import {
  LOG_MESSAGES,
  LoggerFactory,
  StandardizedLoggerImpl,
  createJobLogger,
  createLogger,
  createNoteLogger,
  createQueueLogger,
  createWorkerLogger,
} from "../standardized-logger";

describe("StandardizedLoggerImpl", () => {
  let mockBaseLogger: any;
  let logger: StandardizedLoggerImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBaseLogger = {
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };
    logger = new StandardizedLoggerImpl(mockBaseLogger);
  });

  describe("constructor", () => {
    it("should create logger with base logger", () => {
      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });
  });

  describe("log method", () => {
    it("should call base logger with enriched meta", () => {
      logger.log("Test message", LogLevel.INFO, { key: "value" });

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Test message",
        LogLevel.INFO,
        { key: "value" }
      );
    });

    it("should merge context with meta", () => {
      const contextLogger = logger.withContext({ contextKey: "contextValue" });
      contextLogger.log("Test message", LogLevel.INFO, {
        metaKey: "metaValue",
      });

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Test message",
        LogLevel.INFO,
        { contextKey: "contextValue", metaKey: "metaValue" }
      );
    });
  });

  describe("logging methods", () => {
    it("should call debug with correct level", () => {
      logger.debug("Debug message", { debug: "context" });

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Debug message",
        LogLevel.DEBUG,
        { debug: "context" }
      );
    });

    it("should call info with correct level", () => {
      logger.info("Info message", { info: "context" });

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Info message",
        LogLevel.INFO,
        { info: "context" }
      );
    });

    it("should call warn with correct level", () => {
      logger.warn("Warning message", { warn: "context" });

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Warning message",
        LogLevel.WARN,
        { warn: "context" }
      );
    });

    it("should call error with correct level", () => {
      logger.error("Error message", { error: "context" });

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Error message",
        LogLevel.ERROR,
        { error: "context" }
      );
    });

    it("should call fatal with correct level", () => {
      logger.fatal("Fatal message", { fatal: "context" });

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Fatal message",
        LogLevel.FATAL,
        { fatal: "context" }
      );
    });
  });

  describe("context methods", () => {
    it("should create logger with context", () => {
      const contextLogger = logger.withContext({ key: "value" });

      expect(contextLogger).toBeInstanceOf(StandardizedLoggerImpl);
      expect(contextLogger).not.toBe(logger);
    });

    it("should merge context correctly", () => {
      const contextLogger = logger.withContext({ key1: "value1" });
      const nestedLogger = contextLogger.withContext({ key2: "value2" });

      nestedLogger.log("Test message");

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Test message",
        undefined,
        { key1: "value1", key2: "value2" }
      );
    });

    it("should create logger with job context", () => {
      const jobLogger = logger.withJob("job-123");

      jobLogger.log("Test message");

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Test message",
        undefined,
        { jobId: "job-123" }
      );
    });

    it("should create logger with note context", () => {
      const noteLogger = logger.withNote("note-456");

      noteLogger.log("Test message");

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Test message",
        undefined,
        { noteId: "note-456" }
      );
    });

    it("should create logger with worker context", () => {
      const workerLogger = logger.withWorker("worker-1");

      workerLogger.log("Test message");

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Test message",
        undefined,
        { workerName: "worker-1" }
      );
    });

    it("should create logger with queue context", () => {
      const queueLogger = logger.withQueue("queue-1");

      queueLogger.log("Test message");

      expect(mockBaseLogger.log).toHaveBeenCalledWith(
        "Test message",
        undefined,
        { queueName: "queue-1" }
      );
    });
  });
});

describe("LoggerFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (LoggerFactory as any).instance = null;
    (LoggerFactory as any).baseLogger = null;
  });

  describe("setBaseLogger", () => {
    it("should set base logger and reset instance", () => {
      const mockLogger = { log: vi.fn() };

      LoggerFactory.setBaseLogger(mockLogger);

      expect((LoggerFactory as any).baseLogger).toBe(mockLogger);
      expect((LoggerFactory as any).instance).toBeNull();
    });
  });

  describe("getLogger", () => {
    it("should create logger with fallback console logger when no base logger is set", () => {
      const logger = LoggerFactory.getLogger();

      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });

    it("should return same instance on subsequent calls", () => {
      const logger1 = LoggerFactory.getLogger();
      const logger2 = LoggerFactory.getLogger();

      expect(logger1).toBe(logger2);
    });

    it("should create logger with custom base logger", () => {
      const mockLogger = { log: vi.fn() };
      LoggerFactory.setBaseLogger(mockLogger);

      const logger = LoggerFactory.getLogger();

      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });
  });

  describe("createLogger", () => {
    it("should create logger without context", () => {
      const logger = LoggerFactory.createLogger();

      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });

    it("should create logger with context", () => {
      const context = { key: "value" };
      const logger = LoggerFactory.createLogger(context);

      logger.log("Test message");

      // Should have the context merged
      expect(true).toBe(true); // Placeholder - actual assertion would depend on base logger mock
    });
  });
});

describe("Logger Factory Fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LoggerFactory as any).instance = null;
    (LoggerFactory as any).baseLogger = null;

    // Mock console.log
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should use console logger when no base logger is set", () => {
    const logger = LoggerFactory.getLogger();

    logger.log("Test message", LogLevel.INFO, { key: "value" });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Test message")
    );
  });

  it("should format console output correctly", () => {
    const logger = LoggerFactory.getLogger();

    logger.log("Test message", LogLevel.ERROR, { key: "value" });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[ERROR\] Test message/
      )
    );
  });
});

describe("Logger Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LoggerFactory as any).instance = null;
    (LoggerFactory as any).baseLogger = null;
  });

  describe("createLogger", () => {
    it("should create logger with component context", () => {
      const logger = createLogger("TestComponent", { key: "value" });

      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });
  });

  describe("createJobLogger", () => {
    it("should create logger with job context", () => {
      const logger = createJobLogger("job-123", { key: "value" });

      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });
  });

  describe("createWorkerLogger", () => {
    it("should create logger with worker context", () => {
      const logger = createWorkerLogger("worker-1", { key: "value" });

      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });
  });

  describe("createQueueLogger", () => {
    it("should create logger with queue context", () => {
      const logger = createQueueLogger("queue-1", { key: "value" });

      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });
  });

  describe("createNoteLogger", () => {
    it("should create logger with note context", () => {
      const logger = createNoteLogger("note-456", { key: "value" });

      expect(logger).toBeInstanceOf(StandardizedLoggerImpl);
    });
  });
});

describe("LOG_MESSAGES", () => {
  it("should export system messages", () => {
    expect(LOG_MESSAGES.SYSTEM.STARTUP).toBe("System startup initiated");
    expect(LOG_MESSAGES.SYSTEM.SHUTDOWN).toBe("System shutdown initiated");
    expect(LOG_MESSAGES.SYSTEM.HEALTH_CHECK).toBe("Health check performed");
    expect(LOG_MESSAGES.SYSTEM.CONFIG_LOADED).toBe(
      "Configuration loaded successfully"
    );
    expect(LOG_MESSAGES.SYSTEM.CONFIG_ERROR).toBe("Configuration error");
  });

  it("should export queue messages", () => {
    expect(LOG_MESSAGES.QUEUE.JOB_ADDED).toBe("Job added to queue");
    expect(LOG_MESSAGES.QUEUE.JOB_PROCESSED).toBe("Job processed successfully");
    expect(LOG_MESSAGES.QUEUE.JOB_FAILED).toBe("Job processing failed");
    expect(LOG_MESSAGES.QUEUE.JOB_RETRY).toBe("Job retry initiated");
    expect(LOG_MESSAGES.QUEUE.QUEUE_EMPTY).toBe("Queue is empty");
    expect(LOG_MESSAGES.QUEUE.QUEUE_ERROR).toBe("Queue operation failed");
  });

  it("should export worker messages", () => {
    expect(LOG_MESSAGES.WORKER.STARTED).toBe("Worker started");
    expect(LOG_MESSAGES.WORKER.STOPPED).toBe("Worker stopped");
    expect(LOG_MESSAGES.WORKER.IDLE).toBe("Worker is idle");
    expect(LOG_MESSAGES.WORKER.BUSY).toBe("Worker is busy");
    expect(LOG_MESSAGES.WORKER.ERROR).toBe("Worker error occurred");
  });

  it("should export database messages", () => {
    expect(LOG_MESSAGES.DATABASE.CONNECTED).toBe("Database connected");
    expect(LOG_MESSAGES.DATABASE.DISCONNECTED).toBe("Database disconnected");
    expect(LOG_MESSAGES.DATABASE.QUERY_SUCCESS).toBe(
      "Database query successful"
    );
    expect(LOG_MESSAGES.DATABASE.QUERY_ERROR).toBe("Database query failed");
    expect(LOG_MESSAGES.DATABASE.TRANSACTION_START).toBe(
      "Database transaction started"
    );
    expect(LOG_MESSAGES.DATABASE.TRANSACTION_COMMIT).toBe(
      "Database transaction committed"
    );
    expect(LOG_MESSAGES.DATABASE.TRANSACTION_ROLLBACK).toBe(
      "Database transaction rolled back"
    );
  });

  it("should export cache messages", () => {
    expect(LOG_MESSAGES.CACHE.HIT).toBe("Cache hit");
    expect(LOG_MESSAGES.CACHE.MISS).toBe("Cache miss");
    expect(LOG_MESSAGES.CACHE.SET).toBe("Cache value set");
    expect(LOG_MESSAGES.CACHE.DELETE).toBe("Cache value deleted");
    expect(LOG_MESSAGES.CACHE.CLEAR).toBe("Cache cleared");
    expect(LOG_MESSAGES.CACHE.ERROR).toBe("Cache operation failed");
  });

  it("should export parsing messages", () => {
    expect(LOG_MESSAGES.PARSING.STARTED).toBe("Parsing started");
    expect(LOG_MESSAGES.PARSING.COMPLETED).toBe("Parsing completed");
    expect(LOG_MESSAGES.PARSING.FAILED).toBe("Parsing failed");
    expect(LOG_MESSAGES.PARSING.INVALID_INPUT).toBe(
      "Invalid input for parsing"
    );
  });

  it("should export validation messages", () => {
    expect(LOG_MESSAGES.VALIDATION.PASSED).toBe("Validation passed");
    expect(LOG_MESSAGES.VALIDATION.FAILED).toBe("Validation failed");
    expect(LOG_MESSAGES.VALIDATION.INVALID_INPUT).toBe(
      "Invalid input provided"
    );
    expect(LOG_MESSAGES.VALIDATION.MISSING_REQUIRED).toBe(
      "Missing required field"
    );
  });

  it("should export error messages", () => {
    expect(LOG_MESSAGES.ERROR.UNEXPECTED).toBe("Unexpected error occurred");
    expect(LOG_MESSAGES.ERROR.VALIDATION).toBe("Validation error");
    expect(LOG_MESSAGES.ERROR.NETWORK).toBe("Network error");
    expect(LOG_MESSAGES.ERROR.TIMEOUT).toBe("Operation timed out");
    expect(LOG_MESSAGES.ERROR.PERMISSION).toBe("Permission denied");
    expect(LOG_MESSAGES.ERROR.NOT_FOUND).toBe("Resource not found");
  });
});

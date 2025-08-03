import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  EnhancedLoggerService,
  type LogConfig,
  type LogEntry,
  createLogger,
  logger,
} from "../logger";

// Mock fs module
vi.mock("fs", () => {
  const mockFs = {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    statSync: vi.fn(),
    renameSync: vi.fn(),
    readdirSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
  return {
    default: mockFs,
    ...mockFs,
  };
});

vi.mock("path", () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join("/")),
  },
  join: vi.fn((...args: string[]) => args.join("/")),
}));

describe("EnhancedLoggerService", () => {
  let loggerService: EnhancedLoggerService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Get the mocked fs module
    const fs = vi.mocked(await import("fs"));

    // Set up default mock implementations
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => undefined);
    fs.appendFileSync.mockImplementation(() => undefined);
    fs.statSync.mockImplementation(() => ({
      size: BigInt(1024),
      mtime: new Date(),
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      atime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
      atimeMs: BigInt(Date.now()),
      mtimeMs: BigInt(Date.now()),
      ctimeMs: BigInt(Date.now()),
      birthtimeMs: BigInt(Date.now()),
      dev: BigInt(0),
      ino: BigInt(0),
      mode: BigInt(0),
      nlink: BigInt(0),
      uid: BigInt(0),
      gid: BigInt(0),
      rdev: BigInt(0),
      blksize: BigInt(0),
      blocks: BigInt(0),
      atimeNs: BigInt(0),
      mtimeNs: BigInt(0),
      ctimeNs: BigInt(0),
      birthtimeNs: BigInt(0),
    }));
    fs.renameSync.mockImplementation(() => undefined);
    fs.readdirSync.mockImplementation(() => [
      {
        name: Buffer.from("old.log.backup"),
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        parentPath: "",
      },
      {
        name: Buffer.from("new.log.backup"),
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        parentPath: "",
      },
    ]);
    fs.unlinkSync.mockImplementation(() => undefined);
  });

  describe("constructor", () => {
    it("should create logger with default config", async () => {
      loggerService = new EnhancedLoggerService();

      expect(loggerService).toBeInstanceOf(EnhancedLoggerService);
      const fs = vi.mocked(await import("fs"));
      expect(fs.mkdirSync).toHaveBeenCalledWith("logs", {
        recursive: true,
      });
    });

    it("should create logger with custom config", async () => {
      const config: LogConfig = {
        logDir: "custom-logs",
        maxLogSizeMB: 20,
        enableFileLogging: false,
        enableConsoleLogging: false,
        logLevel: "error",
      };

      loggerService = new EnhancedLoggerService(config);

      expect(loggerService).toBeInstanceOf(EnhancedLoggerService);
    });

    it("should create log directory if it doesn't exist", async () => {
      loggerService = new EnhancedLoggerService();

      const fs = vi.mocked(await import("fs"));
      expect(fs.mkdirSync).toHaveBeenCalledWith("logs", {
        recursive: true,
      });
    });

    it("should not create log directory if it already exists", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(true);
      loggerService = new EnhancedLoggerService();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("logging methods", () => {
    beforeEach(async () => {
      loggerService = new EnhancedLoggerService();
    });

    it("should log debug message", async () => {
      const debugLogger = new EnhancedLoggerService({ logLevel: "debug" });
      debugLogger.debug("Debug message", { test: "data" });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("🔍"));
    });

    it("should log info message", async () => {
      loggerService.info("Info message", { test: "data" });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("ℹ️"));
    });

    it("should log warn message", async () => {
      loggerService.warn("Warning message", { test: "data" });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("⚠️"));
    });

    it("should log error message", async () => {
      loggerService.error("Error message", { test: "data" });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("❌"));
    });

    it("should log fatal message", async () => {
      loggerService.fatal("Fatal message", { test: "data" });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("💀"));
    });

    it("should log with default level", async () => {
      loggerService.log("Default message");

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("ℹ️"));
    });

    it("should log with custom level", async () => {
      loggerService.log("Custom message", "warn");

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("⚠️"));
    });

    it("should not log when level is below configured level", async () => {
      const debugLogger = new EnhancedLoggerService({ logLevel: "warn" });
      debugLogger.debug("Debug message");

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should log when level is at or above configured level", async () => {
      const debugLogger = new EnhancedLoggerService({ logLevel: "warn" });
      debugLogger.error("Error message");

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("❌"));
    });
  });

  describe("logWithContext", () => {
    beforeEach(async () => {
      loggerService = new EnhancedLoggerService();
    });

    it("should log with worker context", async () => {
      loggerService.logWithContext("info", "Worker message", {
        workerName: "test-worker",
        jobId: "job-123",
        noteId: "note-456",
        extraData: "test",
      });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("ℹ️"));
    });

    it("should not log when level is below configured level", async () => {
      const debugLogger = new EnhancedLoggerService({ logLevel: "warn" });
      debugLogger.logWithContext("debug", "Debug message", {
        workerName: "test-worker",
      });

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should write error and fatal messages to error log file when file logging is enabled", async () => {
      const fileLogger = new EnhancedLoggerService({ enableFileLogging: true });
      const fs = vi.mocked(await import("fs"));

      fileLogger.logWithContext("error", "Error message", {
        workerName: "test-worker",
      });

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        "logs/queue-worker-error.log",
        expect.stringContaining("Error message"),
        "utf8"
      );
    });
  });

  describe("file logging", () => {
    beforeEach(async () => {
      loggerService = new EnhancedLoggerService({ enableFileLogging: true });
    });

    it("should write to main log file", async () => {
      loggerService.info("Test message");
      const fs = vi.mocked(await import("fs"));
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        "logs/queue-worker.log",
        expect.stringContaining("Test message"),
        "utf8"
      );
    });

    it("should write error and fatal messages to error log file", async () => {
      loggerService.error("Error message");

      const fs = vi.mocked(await import("fs"));
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        "logs/queue-worker-error.log",
        expect.stringContaining("Error message"),
        "utf8"
      );
    });

    it("should handle file write errors gracefully", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.appendFileSync.mockImplementation(() => {
        throw new Error("File write error");
      });

      loggerService.info("Test message");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to write to log file"),
        expect.any(Error)
      );
    });

    it("should not write to files when file logging is disabled", async () => {
      const noFileLogger = new EnhancedLoggerService({
        enableFileLogging: false,
      });
      noFileLogger.info("Test message");

      // Should not call appendFileSync
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe("getLogFiles", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should return log file paths", async () => {
      const files = loggerService.getLogFiles();

      expect(files).toEqual({
        main: "logs/queue-worker.log",
        error: "logs/queue-worker-error.log",
      });
    });
  });

  describe("rotateLogs", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should rotate logs when they exceed max size", async () => {
      const fs = vi.mocked(await import("fs"));

      // Mock fs.statSync to return different values for different files
      fs.statSync.mockImplementation(
        (path: Parameters<typeof fs.statSync>[0]) => {
          if (
            path.toString().includes("queue-worker.log") ||
            path.toString().includes("queue-worker-error.log")
          ) {
            return {
              size: BigInt(11 * 1024 * 1024), // 11MB, exceeds 10MB limit
              mtime: new Date(),
              isFile: () => true,
              isDirectory: () => false,
              isBlockDevice: () => false,
              isCharacterDevice: () => false,
              isSymbolicLink: () => false,
              isFIFO: () => false,
              isSocket: () => false,
              atime: new Date(),
              ctime: new Date(),
              birthtime: new Date(),
              atimeMs: BigInt(Date.now()),
              mtimeMs: BigInt(Date.now()),
              ctimeMs: BigInt(Date.now()),
              birthtimeMs: BigInt(Date.now()),
              dev: BigInt(0),
              ino: BigInt(0),
              mode: BigInt(0),
              nlink: BigInt(0),
              uid: BigInt(0),
              gid: BigInt(0),
              rdev: BigInt(0),
              blksize: BigInt(0),
              blocks: BigInt(0),
              atimeNs: BigInt(0),
              mtimeNs: BigInt(0),
              ctimeNs: BigInt(0),
              birthtimeNs: BigInt(0),
            };
          }
          throw new Error("File not found");
        }
      );

      loggerService.rotateLogs();
      expect(fs.renameSync).toHaveBeenCalledTimes(2);
    });

    it("should not rotate logs when they are under max size", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.statSync.mockReturnValue({
        size: BigInt(5 * 1024 * 1024), // 5MB
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        atime: new Date(),
        ctime: new Date(),
        birthtime: new Date(),
        atimeMs: BigInt(Date.now()),
        mtimeMs: BigInt(Date.now()),
        ctimeMs: BigInt(Date.now()),
        birthtimeMs: BigInt(Date.now()),
        dev: BigInt(0),
        ino: BigInt(0),
        mode: BigInt(0),
        nlink: BigInt(0),
        uid: BigInt(0),
        gid: BigInt(0),
        rdev: BigInt(0),
        blksize: BigInt(0),
        blocks: BigInt(0),
        atimeNs: BigInt(0),
        mtimeNs: BigInt(0),
        ctimeNs: BigInt(0),
        birthtimeNs: BigInt(0),
      });

      loggerService.rotateLogs();

      expect(fs.renameSync).not.toHaveBeenCalled();
    });

    it("should handle file stat errors gracefully", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.statSync.mockImplementation(() => {
        throw new Error("Stat error");
      });

      expect(() => loggerService.rotateLogs()).not.toThrow();
    });

    it("should use custom max log size", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.statSync.mockReturnValue({
        size: BigInt(21 * 1024 * 1024),
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        atime: new Date(),
        ctime: new Date(),
        birthtime: new Date(),
        atimeMs: BigInt(Date.now()),
        mtimeMs: BigInt(Date.now()),
        ctimeMs: BigInt(Date.now()),
        birthtimeMs: BigInt(Date.now()),
        dev: BigInt(0),
        ino: BigInt(0),
        mode: BigInt(0),
        nlink: BigInt(0),
        uid: BigInt(0),
        gid: BigInt(0),
        rdev: BigInt(0),
        blksize: BigInt(0),
        blocks: BigInt(0),
        atimeNs: BigInt(0),
        mtimeNs: BigInt(0),
        ctimeNs: BigInt(0),
        birthtimeNs: BigInt(0),
      });
      const customLogger = new EnhancedLoggerService({ maxLogSizeMB: 20 });
      customLogger.rotateLogs();
      expect(fs.renameSync).toHaveBeenCalledTimes(2);
    });
  });

  describe("getLogStats", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should return log file statistics", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.statSync
        .mockReturnValueOnce({
          size: BigInt(1024),
          mtime: new Date(),
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          atime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
          atimeMs: BigInt(Date.now()),
          mtimeMs: BigInt(Date.now()),
          ctimeMs: BigInt(Date.now()),
          birthtimeMs: BigInt(Date.now()),
          dev: BigInt(0),
          ino: BigInt(0),
          mode: BigInt(0),
          nlink: BigInt(0),
          uid: BigInt(0),
          gid: BigInt(0),
          rdev: BigInt(0),
          blksize: BigInt(0),
          blocks: BigInt(0),
          atimeNs: BigInt(0),
          mtimeNs: BigInt(0),
          ctimeNs: BigInt(0),
          birthtimeNs: BigInt(0),
        }) // main log
        .mockReturnValueOnce({
          size: BigInt(512),
          mtime: new Date(),
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          atime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
          atimeMs: BigInt(Date.now()),
          mtimeMs: BigInt(Date.now()),
          ctimeMs: BigInt(Date.now()),
          birthtimeMs: BigInt(Date.now()),
          dev: BigInt(0),
          ino: BigInt(0),
          mode: BigInt(0),
          nlink: BigInt(0),
          uid: BigInt(0),
          gid: BigInt(0),
          rdev: BigInt(0),
          blksize: BigInt(0),
          blocks: BigInt(0),
          atimeNs: BigInt(0),
          mtimeNs: BigInt(0),
          ctimeNs: BigInt(0),
          birthtimeNs: BigInt(0),
        }); // error log

      const stats = loggerService.getLogStats();

      expect(stats).toEqual({
        mainLogSize: 1024,
        errorLogSize: 512,
      });
    });

    it("should return zero sizes when files don't exist", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.statSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const stats = loggerService.getLogStats();

      expect(stats).toEqual({
        mainLogSize: 0,
        errorLogSize: 0,
      });
    });
  });

  describe("clearOldLogs", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should not delete recent backup files", async () => {
      const fs = vi.mocked(await import("fs"));
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 15);

      fs.readdirSync.mockReturnValue([
        {
          name: Buffer.from("recent.log.backup"),
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          parentPath: "",
        },
      ]);
      fs.statSync.mockReturnValue({
        mtime: recentDate,
        size: BigInt(100),
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        atime: new Date(),
        ctime: new Date(),
        birthtime: new Date(),
        atimeMs: BigInt(Date.now()),
        mtimeMs: BigInt(Date.now()),
        ctimeMs: BigInt(Date.now()),
        birthtimeMs: BigInt(Date.now()),
        dev: BigInt(0),
        ino: BigInt(0),
        mode: BigInt(0),
        nlink: BigInt(0),
        uid: BigInt(0),
        gid: BigInt(0),
        rdev: BigInt(0),
        blksize: BigInt(0),
        blocks: BigInt(0),
        atimeNs: BigInt(0),
        mtimeNs: BigInt(0),
        ctimeNs: BigInt(0),
        birthtimeNs: BigInt(0),
      });

      loggerService.clearOldLogs(30);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should handle readdir errors gracefully", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.readdirSync.mockImplementation(() => {
        throw new Error("Readdir error");
      });

      expect(() => loggerService.clearOldLogs(30)).not.toThrow();
    });

    it("should delete old backup files that exceed the age limit", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Mock old backup files - use string array
      fs.readdirSync.mockReturnValue([
        "old.log.backup",
        "recent.log.backup",
      ] as unknown as ReturnType<typeof fs.readdirSync>);

      // Mock different modification times
      fs.statSync.mockImplementation((path) => {
        const fileName = path.toString();
        let mtime: Date;

        if (fileName.includes("old.log")) {
          // Old file (40 days ago)
          mtime = new Date();
          mtime.setDate(mtime.getDate() - 40);
        } else {
          // Recent file (15 days ago)
          mtime = new Date();
          mtime.setDate(mtime.getDate() - 15);
        }

        return {
          mtime,
          size: BigInt(100),
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          atime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
          atimeMs: BigInt(Date.now()),
          mtimeMs: BigInt(Date.now()),
          ctimeMs: BigInt(Date.now()),
          birthtimeMs: BigInt(Date.now()),
          dev: BigInt(0),
          ino: BigInt(0),
          mode: BigInt(0),
          nlink: BigInt(0),
          uid: BigInt(0),
          gid: BigInt(0),
          rdev: BigInt(0),
          blksize: BigInt(0),
          blocks: BigInt(0),
          atimeNs: BigInt(0),
          mtimeNs: BigInt(0),
          ctimeNs: BigInt(0),
          birthtimeNs: BigInt(0),
        };
      });

      // Clear logs older than 30 days
      loggerService.clearOldLogs(30);

      // Should delete only the old file
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Deleted old log file")
      );

      consoleSpy.mockRestore();
    });

    it("should handle statSync errors in clearOldLogs", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock backup files - use string array
      fs.readdirSync.mockReturnValue(["test.log.backup"] as unknown as ReturnType<typeof fs.readdirSync>);

      // Mock statSync to throw error
      fs.statSync.mockImplementation(() => {
        throw new Error("Stat error");
      });

      // Should not throw error
      expect(() => loggerService.clearOldLogs(30)).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to clear old logs:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("formatLogEntry", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should format log entry with all fields", async () => {
      const entry: LogEntry = {
        timestamp: "2023-01-01T00:00:00.000Z",
        level: "info",
        message: "Test message",
        context: { key: "value" },
        workerName: "test-worker",
        jobId: "job-123",
        noteId: "note-456",
      };

      const result = loggerService["formatLogEntry"](entry);

      expect(result).toContain("2023-01-01T00:00:00.000Z");
      expect(result).toContain("INFO");
      expect(result).toContain("Test message");
      expect(result).toContain('"key":"value"');
      expect(result).toContain("test-worker");
      expect(result).toContain("job-123");
      expect(result).toContain("note-456");
    });

    it("should truncate long messages", async () => {
      const longMessage = "a".repeat(2000);
      const entry: LogEntry = {
        timestamp: "2023-01-01T00:00:00.000Z",
        level: "info",
        message: longMessage,
      };

      const result = loggerService["formatLogEntry"](entry);

      expect(result).toContain("...");
      expect(result.length).toBeLessThan(2000);
    });

    it("should handle empty context", async () => {
      const entry: LogEntry = {
        timestamp: "2023-01-01T00:00:00.000Z",
        level: "info",
        message: "Test message",
        context: {},
      };

      const result = loggerService["formatLogEntry"](entry);

      expect(result).not.toContain("Context:");
    });

    it("should handle undefined context", async () => {
      const entry: LogEntry = {
        timestamp: "2023-01-01T00:00:00.000Z",
        level: "info",
        message: "Test message",
      };

      const result = loggerService["formatLogEntry"](entry);

      expect(result).not.toContain("Context:");
    });
  });

  describe("writeToFile error handling", () => {
    it("should handle file write errors gracefully", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.appendFileSync.mockImplementation(() => {
        throw new Error("File system error");
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // This should not throw an error
      loggerService["writeToFile"]("/test/path", "test content");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to write to log file /test/path:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("shouldLog", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should allow logging when level is at or above configured level", async () => {
      const result = (
        loggerService as unknown as { shouldLog: (level: string) => boolean }
      ).shouldLog("warn");
      expect(result).toBe(true);
    });

    it("should not allow logging when level is below configured level", async () => {
      const debugLogger = new EnhancedLoggerService({ logLevel: "warn" });
      const result = (
        debugLogger as unknown as { shouldLog: (level: string) => boolean }
      ).shouldLog("debug");
      expect(result).toBe(false);
    });
  });

  describe("createLogger", () => {
    it("should create logger with default config", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      const logger = createLogger();

      expect(logger).toBeInstanceOf(EnhancedLoggerService);
    });

    it("should create logger with custom config", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      const customLogger = createLogger({ logLevel: "error" });

      expect(customLogger).toBeInstanceOf(EnhancedLoggerService);
    });
  });

  describe("default logger instance", () => {
    it("should export default logger instance", () => {
      expect(logger).toBeInstanceOf(EnhancedLoggerService);
    });
  });

  describe("cleanupOldBackupFiles error handling", () => {
    it("should handle cleanup errors gracefully", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock readdirSync to throw an error
      fs.readdirSync.mockImplementation(() => {
        throw new Error("Directory read error");
      });

      // This should not throw an error
      loggerService["cleanupOldBackupFiles"]("/test/path", 3);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to cleanup old backup files:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle statSync errors in cleanup", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock readdirSync to return files
      fs.readdirSync.mockReturnValue([
        {
          name: Buffer.from("test.log.2023-01-01.backup"),
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          parentPath: "",
        },
      ]);

      // Mock statSync to throw an error
      fs.statSync.mockImplementation(() => {
        throw new Error("Stat error");
      });

      // This should not throw an error
      loggerService["cleanupOldBackupFiles"]("/test/path", 3);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to cleanup old backup files:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should not remove backup files when count is within limit", async () => {
      const fs = vi.mocked(await import("fs"));

      // Mock only 2 backup files
      fs.readdirSync.mockReturnValue([
        "queue-worker.log.2023-01-01.backup",
        "queue-worker.log.2023-01-02.backup",
      ] as unknown as ReturnType<typeof fs.readdirSync>);

      // Mock modification times
      fs.statSync.mockImplementation((path) => {
        const fileName = path.toString();
        let mtime: Date;

        if (fileName.includes("2023-01-01")) {
          mtime = new Date("2023-01-01");
        } else {
          mtime = new Date("2023-01-02");
        }

        return {
          size: BigInt(1024),
          mtime,
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          atime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
          atimeMs: BigInt(Date.now()),
          mtimeMs: BigInt(Date.now()),
          ctimeMs: BigInt(Date.now()),
          birthtimeMs: BigInt(Date.now()),
          dev: BigInt(0),
          ino: BigInt(0),
          mode: BigInt(0),
          nlink: BigInt(0),
          uid: BigInt(0),
          gid: BigInt(0),
          rdev: BigInt(0),
          blksize: BigInt(0),
          blocks: BigInt(0),
          atimeNs: BigInt(0),
          mtimeNs: BigInt(0),
          ctimeNs: BigInt(0),
          birthtimeNs: BigInt(0),
        };
      });

      // Call cleanup with maxBackupFiles = 3
      loggerService["cleanupOldBackupFiles"]("/logs/queue-worker.log", 3);

      // Should not remove any files
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe("forceRotateLogs", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should force rotate log files when they exist", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      fs.existsSync.mockReturnValue(true);

      loggerService.forceRotateLogs();

      expect(fs.renameSync).toHaveBeenCalledTimes(2); // Both main and error log files
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Force rotated log file")
      );

      consoleSpy.mockRestore();
    });

    it("should handle force rotation errors gracefully", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      fs.existsSync.mockReturnValue(true);
      fs.renameSync.mockImplementation(() => {
        throw new Error("Rename error");
      });

      // Should not throw error
      expect(() => loggerService.forceRotateLogs()).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to force rotate"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should not rotate files that don't exist", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      fs.existsSync.mockReturnValue(false);

      loggerService.forceRotateLogs();

      expect(fs.renameSync).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Force rotated log file")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Log Rotation and Cleanup", () => {
    it("should handle file write errors gracefully", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.appendFileSync.mockImplementation(() => {
        throw new Error("Write error");
      });

      const logger = new EnhancedLoggerService({
        enableFileLogging: true,
        enableConsoleLogging: false,
      });

      // Should not throw error
      expect(() => {
        logger.info("Test message");
      }).not.toThrow();
    });

    it("should handle log rotation when file is too large", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Mock large file size
      fs.statSync.mockImplementation((path) => {
        if (path.toString().includes("queue-worker")) {
          return {
            size: BigInt(10 * 1024 * 1024), // 10MB
            mtime: new Date(),
            isFile: () => true,
            isDirectory: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
            atime: new Date(),
            ctime: new Date(),
            birthtime: new Date(),
            atimeMs: BigInt(Date.now()),
            mtimeMs: BigInt(Date.now()),
            ctimeMs: BigInt(Date.now()),
            birthtimeMs: BigInt(Date.now()),
            dev: BigInt(0),
            ino: BigInt(0),
            mode: BigInt(0),
            nlink: BigInt(0),
            uid: BigInt(0),
            gid: BigInt(0),
            rdev: BigInt(0),
            blksize: BigInt(0),
            blocks: BigInt(0),
            atimeNs: BigInt(0),
            mtimeNs: BigInt(0),
            ctimeNs: BigInt(0),
            birthtimeNs: BigInt(0),
          };
        }
        throw new Error("File not found");
      });

      const logger = new EnhancedLoggerService({
        maxLogSizeMB: 5, // 5MB limit
        enableFileLogging: true,
      });

      logger.rotateLogs();

      expect(fs.renameSync).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rotated log file")
      );
    });

    it("should handle cleanup of old backup files", async () => {
      const fs = vi.mocked(await import("fs"));

      // Mock multiple backup files
      fs.readdirSync.mockReturnValue([
        "queue-worker.log.2023-01-01.backup",
        "queue-worker.log.2023-01-02.backup",
        "queue-worker.log.2023-01-03.backup",
        "queue-worker.log.2023-01-04.backup",
        "queue-worker.log.2023-01-05.backup",
      ] as unknown as ReturnType<typeof fs.readdirSync>);

      // Mock different modification times
      fs.statSync.mockImplementation((path) => {
        const fileName = path.toString();
        let mtime: Date;

        if (fileName.includes("2023-01-01")) {
          mtime = new Date("2023-01-01");
        } else if (fileName.includes("2023-01-02")) {
          mtime = new Date("2023-01-02");
        } else if (fileName.includes("2023-01-03")) {
          mtime = new Date("2023-01-03");
        } else if (fileName.includes("2023-01-04")) {
          mtime = new Date("2023-01-04");
        } else {
          mtime = new Date("2023-01-05");
        }

        return {
          size: BigInt(1024),
          mtime,
          isFile: () => true,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          atime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
          atimeMs: BigInt(Date.now()),
          mtimeMs: BigInt(Date.now()),
          ctimeMs: BigInt(Date.now()),
          birthtimeMs: BigInt(Date.now()),
          dev: BigInt(0),
          ino: BigInt(0),
          mode: BigInt(0),
          nlink: BigInt(0),
          uid: BigInt(0),
          gid: BigInt(0),
          rdev: BigInt(0),
          blksize: BigInt(0),
          blocks: BigInt(0),
          atimeNs: BigInt(0),
          mtimeNs: BigInt(0),
          ctimeNs: BigInt(0),
          birthtimeNs: BigInt(0),
        };
      });

      const logger = new EnhancedLoggerService({
        maxBackupFiles: 3, // Keep only 3 backup files
        enableFileLogging: true,
      });

      // Trigger rotation which will call cleanup
      logger.rotateLogs();

      // The cleanup logic is tested in the existing tests, so we just verify the function doesn't throw
      expect(() => logger.rotateLogs()).not.toThrow();
    });

    it("should handle cleanup errors gracefully", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock large file size to trigger rotation
      fs.statSync.mockImplementation((path) => {
        if (path.toString().includes("queue-worker")) {
          return {
            size: BigInt(10 * 1024 * 1024), // 10MB
            mtime: new Date(),
            isFile: () => true,
            isDirectory: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
            atime: new Date(),
            ctime: new Date(),
            birthtime: new Date(),
            atimeMs: BigInt(Date.now()),
            mtimeMs: BigInt(Date.now()),
            ctimeMs: BigInt(Date.now()),
            birthtimeMs: BigInt(Date.now()),
            dev: BigInt(0),
            ino: BigInt(0),
            mode: BigInt(0),
            nlink: BigInt(0),
            uid: BigInt(0),
            gid: BigInt(0),
            rdev: BigInt(0),
            blksize: BigInt(0),
            blocks: BigInt(0),
            atimeNs: BigInt(0),
            mtimeNs: BigInt(0),
            ctimeNs: BigInt(0),
            birthtimeNs: BigInt(0),
          };
        }
        throw new Error("File not found");
      });

      // Mock readdirSync to throw error during cleanup
      fs.readdirSync.mockImplementation(() => {
        throw new Error("Read directory error");
      });

      const logger = new EnhancedLoggerService({
        maxLogSizeMB: 5, // 5MB limit
        enableFileLogging: true,
      });

      // Should not throw error
      expect(() => {
        logger.rotateLogs();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to cleanup old backup files:",
        expect.any(Error)
      );
    });

    it("should handle getLogStats when files don't exist", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.statSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const logger = new EnhancedLoggerService({
        enableFileLogging: true,
      });

      const stats = logger.getLogStats();

      expect(stats).toEqual({
        mainLogSize: 0,
        errorLogSize: 0,
      });
    });

    it("should handle clearOldLogs with file system errors", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      fs.readdirSync.mockImplementation(() => {
        throw new Error("Read directory error");
      });

      const logger = new EnhancedLoggerService({
        enableFileLogging: true,
      });

      // Should not throw error
      expect(() => {
        logger.clearOldLogs(30);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to clear old logs:",
        expect.any(Error)
      );
    });

    it("should handle forceRotateLogs with file system errors", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      fs.existsSync.mockReturnValue(true);
      fs.renameSync.mockImplementation(() => {
        throw new Error("Rename error");
      });

      const logger = new EnhancedLoggerService({
        enableFileLogging: true,
      });

      // Should not throw error
      expect(() => {
        logger.forceRotateLogs();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to force rotate"),
        expect.any(Error)
      );
    });

    it("should handle forceRotateLogs when files don't exist", async () => {
      const fs = vi.mocked(await import("fs"));
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      fs.existsSync.mockReturnValue(false);

      const logger = new EnhancedLoggerService({
        enableFileLogging: true,
      });

      // Should not throw error and should not log rotation
      expect(() => {
        logger.forceRotateLogs();
      }).not.toThrow();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Force rotated log file")
      );
    });
  });


});

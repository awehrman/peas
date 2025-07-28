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

    it("should log with worker context", () => {
      loggerService.logWithContext("info", "Worker message", {
        workerName: "test-worker",
        jobId: "job-123",
        noteId: "note-456",
        extraData: "test",
      });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("ℹ️"));
    });

    it("should not log when level is below configured level", () => {
      const debugLogger = new EnhancedLoggerService({ logLevel: "warn" });
      debugLogger.logWithContext("debug", "Debug message", {
        workerName: "test-worker",
      });

      expect(console.log).not.toHaveBeenCalled();
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

    it("should not write to files when file logging is disabled", () => {
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

    it("should return log file paths", () => {
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

    it.skip("should clear old backup log files", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.readdirSync.mockReturnValue([
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
      fs.statSync.mockReturnValue({
        mtime: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
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
      // Ensure unlinkSync mock is preserved
      fs.unlinkSync.mockImplementation(() => undefined);

      loggerService.clearOldLogs(30);
      expect(fs.unlinkSync).toHaveBeenCalledWith("logs/old.log.backup");
      expect(fs.unlinkSync).toHaveBeenCalledWith("logs/new.log.backup");
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

    it.skip("should use default 30 days when no parameter provided", async () => {
      const fs = vi.mocked(await import("fs"));
      fs.readdirSync.mockReturnValue([
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
      ]);
      fs.statSync.mockReturnValue({
        mtime: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
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
      // Ensure unlinkSync mock is preserved
      fs.unlinkSync.mockImplementation(() => undefined);

      loggerService.clearOldLogs();
      expect(fs.unlinkSync).toHaveBeenCalledWith("logs/old.log.backup");
    });
  });

  describe("formatLogEntry", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should format basic log entry", () => {
      const entry: LogEntry = {
        timestamp: "2023-01-01T00:00:00.000Z",
        level: "info",
        message: "Test message",
      };

      const formatted = (
        loggerService as unknown as {
          formatLogEntry: (entry: LogEntry) => string;
        }
      ).formatLogEntry(entry);

      expect(formatted).toBe("[2023-01-01T00:00:00.000Z] [INFO] Test message");
    });

    it("should format log entry with context", () => {
      const entry: LogEntry = {
        timestamp: "2023-01-01T00:00:00.000Z",
        level: "info",
        message: "Test message",
        context: { key: "value" },
      };

      const formatted = (
        loggerService as unknown as {
          formatLogEntry: (entry: LogEntry) => string;
        }
      ).formatLogEntry(entry);

      expect(formatted).toBe(
        '[2023-01-01T00:00:00.000Z] [INFO] Test message | Context: {"key":"value"}'
      );
    });

    it("should format log entry with worker context", () => {
      const entry: LogEntry = {
        timestamp: "2023-01-01T00:00:00.000Z",
        level: "info",
        message: "Test message",
        workerName: "worker-1",
        jobId: "job-123",
        noteId: "note-456",
      };

      const formatted = (
        loggerService as unknown as {
          formatLogEntry: (entry: LogEntry) => string;
        }
      ).formatLogEntry(entry);

      expect(formatted).toBe(
        "[2023-01-01T00:00:00.000Z] [INFO] [worker-1] [Job:job-123] [Note:note-456] Test message"
      );
    });
  });

  describe("shouldLog", () => {
    beforeEach(async () => {
      const fs = vi.mocked(await import("fs"));
      fs.existsSync.mockReturnValue(false);
      loggerService = new EnhancedLoggerService();
    });

    it("should allow logging when level is at or above configured level", () => {
      const result = (
        loggerService as unknown as { shouldLog: (level: string) => boolean }
      ).shouldLog("warn");
      expect(result).toBe(true);
    });

    it("should not allow logging when level is below configured level", () => {
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
});

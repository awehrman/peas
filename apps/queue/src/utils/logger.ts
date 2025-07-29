import fs from "fs";
import path from "path";

import type { ILoggerService } from "../services";

export interface LogConfig {
  /** Directory to store log files */
  logDir?: string;
  /** Maximum log file size in MB before rotation */
  maxLogSizeMB?: number;
  /** Whether to enable file logging */
  enableFileLogging?: boolean;
  /** Whether to enable console logging */
  enableConsoleLogging?: boolean;
  /** Log level filter */
  logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
  /** Maximum message length before truncation */
  maxMessageLength?: number;
  /** Maximum number of backup files to keep */
  maxBackupFiles?: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  workerName?: string;
  jobId?: string;
  noteId?: string;
}

/**
 * Enhanced logger service with file logging capabilities
 */
export class EnhancedLoggerService implements ILoggerService {
  private logDir: string;
  private logFile: string;
  private errorLogFile: string;
  private config: LogConfig;
  private lastRotationCheck: number = 0;
  private readonly ROTATION_CHECK_INTERVAL = 60000; // Check every minute

  constructor(config: LogConfig = {}) {
    this.config = {
      logDir: "logs",
      maxLogSizeMB: 5, // Reduced from 10MB to 5MB for better management
      enableFileLogging: true,
      enableConsoleLogging: true,
      logLevel: "info",
      maxMessageLength: 1000, // Truncate messages longer than 1000 characters
      maxBackupFiles: 3, // Keep only 3 backup files
      ...config,
    };

    this.logDir = this.config.logDir!;
    this.logFile = path.join(this.logDir, "queue-worker.log");
    this.errorLogFile = path.join(this.logDir, "queue-worker-error.log");

    if (this.config.enableFileLogging) {
      this.ensureLogDirectory();
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ["debug", "info", "warn", "error", "fatal"];
    const configLevel = this.config.logLevel || "info";
    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }

  private formatLogEntry(entry: LogEntry): string {
    const parts = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`];

    if (entry.workerName) {
      parts.push(`[${entry.workerName}]`);
    }

    if (entry.jobId) {
      parts.push(`[job:${entry.jobId}]`);
    }

    if (entry.noteId) {
      parts.push(`[note:${entry.noteId}]`);
    }

    // Truncate message if it's too long
    let message = entry.message;
    const maxLength = this.config.maxMessageLength || 1000;
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + "...";
    }

    parts.push(message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(`| Context: ${JSON.stringify(entry.context)}`);
    }

    return parts.join(" ");
  }

  private writeToFile(filePath: string, content: string): void {
    try {
      // Check for rotation before writing
      this.checkAndRotateLogs();

      fs.appendFileSync(filePath, content + "\n", "utf8");
    } catch (error) {
      // Fallback to console if file writing fails
      console.error(`Failed to write to log file ${filePath}:`, error);
    }
  }

  private checkAndRotateLogs(): void {
    const now = Date.now();

    // Only check for rotation every minute to avoid performance issues
    if (now - this.lastRotationCheck < this.ROTATION_CHECK_INTERVAL) {
      return;
    }

    this.lastRotationCheck = now;
    this.rotateLogs();
  }

  private logInternal(
    level: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    const logMessage = this.formatLogEntry(entry);

    // Console logging
    if (this.config.enableConsoleLogging) {
      const prefix =
        {
          debug: "🔍",
          info: "ℹ️",
          warn: "⚠️",
          error: "❌",
          fatal: "💀",
        }[level] || "ℹ️";

      console.log(`${prefix} ${logMessage}`);
    }

    // File logging
    if (this.config.enableFileLogging) {
      if (level === "error" || level === "fatal") {
        this.writeToFile(this.errorLogFile, logMessage);
      }
      this.writeToFile(this.logFile, logMessage);
    }
  }

  // Public log method to implement ILoggerService interface
  log(message: string, level?: string, meta?: Record<string, unknown>): void {
    this.logInternal(level ?? "info", message, meta);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logInternal("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logInternal("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logInternal("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logInternal("error", message, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.logInternal("fatal", message, context);
  }

  /**
   * Log with worker context
   */
  logWithContext(
    level: string,
    message: string,
    context: {
      workerName?: string;
      jobId?: string;
      noteId?: string;
      [key: string]: unknown;
    }
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      workerName: context.workerName,
      jobId: context.jobId,
      noteId: context.noteId,
      context: Object.fromEntries(
        Object.entries(context).filter(
          ([key]) => !["workerName", "jobId", "noteId"].includes(key)
        )
      ),
    };

    const logMessage = this.formatLogEntry(entry);

    // Console logging
    if (this.config.enableConsoleLogging) {
      const prefix =
        {
          debug: "🔍",
          info: "ℹ️",
          warn: "⚠️",
          error: "❌",
          fatal: "💀",
        }[level] || "ℹ️";

      console.log(`${prefix} ${logMessage}`);
    }

    // File logging
    if (this.config.enableFileLogging) {
      if (level === "error" || level === "fatal") {
        this.writeToFile(this.errorLogFile, logMessage);
      }
      this.writeToFile(this.logFile, logMessage);
    }
  }

  /**
   * Get log file paths
   */
  getLogFiles(): { main: string; error: string } {
    return {
      main: this.logFile,
      error: this.errorLogFile,
    };
  }

  /**
   * Rotate log files if they get too large
   */
  rotateLogs(): void {
    const maxSizeBytes = (this.config.maxLogSizeMB || 5) * 1024 * 1024;
    const maxBackupFiles = this.config.maxBackupFiles || 3;

    [this.logFile, this.errorLogFile].forEach((filePath) => {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > maxSizeBytes) {
          const timestamp = new Date().toISOString().split("T")[0];
          const backupPath = `${filePath}.${timestamp}.backup`;

          // Rotate the file
          fs.renameSync(filePath, backupPath);
          console.log(`Rotated log file: ${filePath} -> ${backupPath}`);

          // Clean up old backup files
          this.cleanupOldBackupFiles(filePath, maxBackupFiles);
        }
      } catch {
        // File doesn't exist or other error, ignore
      }
    });
  }

  /**
   * Clean up old backup files, keeping only the specified number
   */
  private cleanupOldBackupFiles(
    baseFilePath: string,
    maxBackupFiles: number
  ): void {
    try {
      const logDir = path.dirname(baseFilePath);
      const baseFileName = path.basename(baseFilePath);
      const files = fs.readdirSync(logDir);

      // Find all backup files for this log file
      const backupFiles = files
        .filter(
          (file) => file.startsWith(baseFileName) && file.endsWith(".backup")
        )
        .map((file) => ({
          name: file,
          path: path.join(logDir, file),
          mtime: fs.statSync(path.join(logDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

      // Remove excess backup files
      if (backupFiles.length > maxBackupFiles) {
        const filesToRemove = backupFiles.slice(maxBackupFiles);
        filesToRemove.forEach((file) => {
          fs.unlinkSync(file.path);
          console.log(`Removed old backup file: ${file.name}`);
        });
      }
    } catch (error) {
      console.error("Failed to cleanup old backup files:", error);
    }
  }

  /**
   * Get log statistics
   */
  getLogStats(): { mainLogSize: number; errorLogSize: number } {
    try {
      const mainStats = fs.statSync(this.logFile);
      const errorStats = fs.statSync(this.errorLogFile);
      return {
        mainLogSize: Number(mainStats.size),
        errorLogSize: Number(errorStats.size),
      };
    } catch {
      return {
        mainLogSize: 0,
        errorLogSize: 0,
      };
    }
  }

  /**
   * Clear old log files (older than specified days)
   */
  clearOldLogs(daysOld: number = 30): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        const fileName = file.toString();
        if (fileName.endsWith(".backup")) {
          const filePath = path.join(this.logDir, fileName);
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old log file: ${fileName}`);
          }
        }
      });
    } catch (error) {
      console.error("Failed to clear old logs:", error);
    }
  }

  /**
   * Force rotation of log files regardless of size
   */
  forceRotateLogs(): void {
    const timestamp = new Date().toISOString().split("T")[0];

    [this.logFile, this.errorLogFile].forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          const backupPath = `${filePath}.${timestamp}.backup`;
          fs.renameSync(filePath, backupPath);
          console.log(`Force rotated log file: ${filePath} -> ${backupPath}`);
        }
      } catch (error) {
        console.error(`Failed to force rotate ${filePath}:`, error);
      }
    });
  }
}

/**
 * Create a logger instance with default configuration
 */
export function createLogger(config?: LogConfig): EnhancedLoggerService {
  return new EnhancedLoggerService(config);
}

/**
 * Default logger instance
 */
export const logger = createLogger();

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

  constructor(config: LogConfig = {}) {
    this.config = {
      logDir: "logs",
      maxLogSizeMB: 10,
      enableFileLogging: true,
      enableConsoleLogging: true,
      logLevel: "info",
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
      parts.push(`[Job:${entry.jobId}]`);
    }

    if (entry.noteId) {
      parts.push(`[Note:${entry.noteId}]`);
    }

    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(`| Context: ${JSON.stringify(entry.context)}`);
    }

    return parts.join(" ");
  }

  private writeToFile(filePath: string, content: string): void {
    try {
      fs.appendFileSync(filePath, content + "\n", "utf8");
    } catch (error) {
      // Fallback to console if file writing fails
      console.error(`Failed to write to log file ${filePath}:`, error);
    }
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
  log(
    message: string,
    level: "debug" | "info" | "warn" | "error" | "fatal" = "info"
  ): void {
    this.logInternal(level, message);
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
    const maxSizeBytes = (this.config.maxLogSizeMB || 10) * 1024 * 1024;

    [this.logFile, this.errorLogFile].forEach((filePath) => {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > maxSizeBytes) {
          const backupPath = `${filePath}.${new Date().toISOString().split("T")[0]}.backup`;
          fs.renameSync(filePath, backupPath);
          console.log(`Rotated log file: ${filePath} -> ${backupPath}`);
        }
      } catch {
        // File doesn't exist or other error, ignore
      }
    });
  }

  /**
   * Get log statistics
   */
  getLogStats(): { mainLogSize: number; errorLogSize: number } {
    try {
      const mainStats = fs.statSync(this.logFile);
      const errorStats = fs.statSync(this.errorLogFile);
      return {
        mainLogSize: mainStats.size,
        errorLogSize: errorStats.size,
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
        if (file.endsWith(".backup")) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error("Failed to clear old logs:", error);
    }
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

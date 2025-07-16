import { createLogger } from "../utils/logger";

export interface ILoggerService {
  log(
    message: string,
    level?: "debug" | "info" | "warn" | "error" | "fatal"
  ): void;
  debug?(message: string, context?: Record<string, unknown>): void;
  info?(message: string, context?: Record<string, unknown>): void;
  warn?(message: string, context?: Record<string, unknown>): void;
  error?(message: string, context?: Record<string, unknown>): void;
  fatal?(message: string, context?: Record<string, unknown>): void;
  logWithContext?(
    level: string,
    message: string,
    context: Record<string, unknown>
  ): void;
  getLogFiles?(): { main: string; error: string };
  rotateLogs?(maxSizeMB?: number): void;
  getLogStats?(): { mainLogSize: number; errorLogSize: number };
  clearOldLogs?(daysOld?: number): void;
}

export function registerLogger(): ILoggerService {
  return createLogger(); // Use enhanced logger with file logging
}

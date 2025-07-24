import type {
  IConfigService,
  IErrorHandlerService,
  IHealthMonitorService,
  ILoggerService,
  IStatusBroadcasterService,
  IWebSocketService,
} from "./container";

import type { NoteStatus } from "@peas/database";

import { ManagerFactory } from "../config/factory";
import type { OperationContext, StatusEventData } from "../types/common";
import { createLogger } from "../utils/logger";
import { addStatusEventAndBroadcast } from "../utils/status-broadcaster";
import { getWebSocketManager } from "../websocket-server";

// ============================================================================
// SERVICE FACTORY CLASS
// ============================================================================

/**
 * Factory class for creating service instances.
 * Provides centralized service creation with dependency injection support.
 */
export class ServiceFactory {
  /**
   * Create an error handler service instance.
   * @returns IErrorHandlerService instance
   */
  static createErrorHandler(): IErrorHandlerService {
    return new ErrorHandlerService();
  }

  /**
   * Create a health monitor service instance.
   * @returns IHealthMonitorService instance
   */
  static createHealthMonitor(): IHealthMonitorService {
    return new HealthMonitorService();
  }

  /**
   * Create a WebSocket service instance.
   * @returns IWebSocketService instance
   */
  static createWebSocketService(): IWebSocketService {
    return new WebSocketService();
  }

  /**
   * Create a status broadcaster service instance.
   * @returns IStatusBroadcasterService instance
   */
  static createStatusBroadcaster(): IStatusBroadcasterService {
    return new StatusBroadcasterService();
  }

  // Parser service removed - parsing logic is handled by Actions

  /**
   * Create a logger service instance.
   * @returns ILoggerService instance
   */
  static createLoggerService(): ILoggerService {
    return createLogger();
  }

  /**
   * Create a config service instance.
   * @returns IConfigService instance
   */
  static createConfigService(): IConfigService {
    return new ConfigService();
  }
}

// ============================================================================
// SERVICE IMPLEMENTATIONS
// ============================================================================

/**
 * Error handler service implementation
 */
class ErrorHandlerService implements IErrorHandlerService {
  withErrorHandling<T>(
    operation: () => Promise<T>,
    _context: OperationContext
  ): Promise<T> {
    return operation();
  }

  createJobError(
    error: Error,
    context: OperationContext
  ): {
    success: boolean;
    error: string;
    operation: string;
    errorType: string;
    severity: string;
    timestamp: Date;
  } {
    return {
      success: false,
      error: error.message,
      operation: context.operation,
      errorType: error.name || "UNKNOWN_ERROR",
      severity: "error",
      timestamp: new Date(),
    };
  }

  classifyError(error: Error): string {
    return error.name || "UNKNOWN_ERROR";
  }

  logError(error: Error, context: OperationContext): void {
    console.error("Error occurred:", {
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  get errorHandler() {
    return {
      withErrorHandling: this.withErrorHandling.bind(this),
      createJobError: this.createJobError.bind(this),
      classifyError: this.classifyError.bind(this),
      logError: this.logError.bind(this),
    };
  }
}

/**
 * Health monitor service implementation
 */
class HealthMonitorService implements IHealthMonitorService {
  healthMonitor = ManagerFactory.createHealthMonitor();
}

/**
 * WebSocket service implementation
 */
class WebSocketService implements IWebSocketService {
  get webSocketManager() {
    const manager = getWebSocketManager();
    console.log("[WebSocketService] Getting manager:", {
      managerExists: !!manager,
      managerType: manager ? manager.constructor.name : "null",
    });
    return manager;
  }
}

/**
 * Status broadcaster service implementation
 */
class StatusBroadcasterService implements IStatusBroadcasterService {
  addStatusEventAndBroadcast = async (event: StatusEventData) => {
    try {
      // Convert StatusEventData to the format expected by addStatusEventAndBroadcast
      const result = await addStatusEventAndBroadcast({
        importId: event.importId || "",
        noteId: event.noteId,
        status: event.status as NoteStatus,
        message: event.message,
        context: event.context,
        currentCount: event.currentCount as number | undefined,
        totalCount: event.totalCount as number | undefined,
        indentLevel: event.indentLevel as number | undefined,
        metadata: event.metadata,
      });

      return {
        success: true,
        count: 1,
        operation: "broadcast_status_event",
        data: result,
      };
    } catch (error) {
      console.error("❌ StatusBroadcasterService failed:", error);
      return {
        success: false,
        count: 0,
        operation: "broadcast_status_event",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}

// Parser service implementation removed - parsing logic is handled by Actions

/**
 * Config service implementation
 */
class ConfigService implements IConfigService {
  get wsHost(): string | undefined {
    return process.env.WS_HOST;
  }

  get port(): number {
    return parseInt(process.env.PORT || "3000", 10);
  }

  get wsPort(): number {
    return parseInt(process.env.WS_PORT || "8080", 10);
  }
}

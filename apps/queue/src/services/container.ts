import { redisConnection } from "../config/redis";
import { ErrorHandler } from "../utils/error-handler";
import { HealthMonitor } from "../utils/health-monitor";
import { IQueueService, ILoggerService, IDatabaseService } from "./index";
import { registerQueues } from "./register-queues";
import { registerDatabase } from "./register-database";
import { registerLogger } from "./register-logger";
import { SERVER_DEFAULTS, QUEUE_DEFAULTS } from "../config";
import type { NoteStatus } from "@peas/database";

// WebSocket manager type - we'll define this locally since it's not exported
interface WebSocketManager {
  broadcastStatusEvent(event: unknown): void;
  getConnectedClientsCount(): number;
  close(): void;
}

// Worker interface for graceful shutdown
interface Worker {
  close(): Promise<void>;
}

// Status broadcaster interface
interface StatusBroadcaster {
  addStatusEventAndBroadcast(event: {
    importId: string;
    noteId?: string;
    status: NoteStatus;
    message?: string;
    context?: string;
    currentCount?: number;
    totalCount?: number;
  }): Promise<unknown>;
}

// Parser service interface
interface ParserService {
  parseHTML: (content: string) => Promise<unknown>;
}

export interface IErrorHandlerService {
  errorHandler: typeof ErrorHandler;
}

export interface IHealthMonitorService {
  healthMonitor: HealthMonitor;
}

export interface IWebSocketService {
  webSocketManager: WebSocketManager | null;
}

export interface IStatusBroadcasterService {
  statusBroadcaster: StatusBroadcaster | null;
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: NoteStatus;
    message?: string;
    context?: string;
    currentCount?: number;
    totalCount?: number;
  }) => Promise<unknown>;
}

export interface IParserService {
  parsers: ParserService | null;
  parseHTML?: (content: string) => Promise<unknown>;
}

// Configuration interface
export interface IConfigService {
  port: number;
  wsPort: number;
  redisConnection: typeof redisConnection;
  batchSize: number;
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
}

// Main container interface
export interface IServiceContainer {
  queues: IQueueService;
  database: IDatabaseService;
  errorHandler: IErrorHandlerService;
  healthMonitor: IHealthMonitorService;
  webSocket: IWebSocketService;
  statusBroadcaster: IStatusBroadcasterService;
  parsers: IParserService;
  logger: ILoggerService;
  config: IConfigService;
  _workers?: {
    noteWorker?: Worker;
    imageWorker?: Worker;
    ingredientWorker?: Worker;
    instructionWorker?: Worker;
    categorizationWorker?: Worker;
    sourceWorker?: Worker;
  };
  close(): Promise<void>;
}

// Default configuration service
class ConfigService implements IConfigService {
  get port(): number {
    return parseInt(process.env.PORT || SERVER_DEFAULTS.PORT.toString(), 10);
  }

  get wsPort(): number {
    return parseInt(
      process.env.WS_PORT || SERVER_DEFAULTS.WS_PORT.toString(),
      10
    );
  }

  get redisConnection() {
    return redisConnection;
  }

  get batchSize(): number {
    return parseInt(
      process.env.BATCH_SIZE || QUEUE_DEFAULTS.BATCH_SIZE.toString(),
      10
    );
  }

  get maxRetries(): number {
    return parseInt(
      process.env.MAX_RETRIES || QUEUE_DEFAULTS.MAX_RETRIES.toString(),
      10
    );
  }

  get backoffMs(): number {
    return parseInt(
      process.env.BACKOFF_MS || QUEUE_DEFAULTS.BACKOFF_MS.toString(),
      10
    );
  }

  get maxBackoffMs(): number {
    return parseInt(
      process.env.MAX_BACKOFF_MS || QUEUE_DEFAULTS.MAX_BACKOFF_MS.toString(),
      10
    );
  }
}

// Default error handler service implementation
class ErrorHandlerService implements IErrorHandlerService {
  get errorHandler() {
    return ErrorHandler;
  }
}

// Default health monitor service implementation
class HealthMonitorService implements IHealthMonitorService {
  get healthMonitor() {
    return HealthMonitor.getInstance();
  }
}

// Default WebSocket service implementation
class WebSocketService implements IWebSocketService {
  private _webSocketManager: WebSocketManager | null = null;

  get webSocketManager(): WebSocketManager | null {
    return this._webSocketManager;
  }

  set webSocketManager(manager: WebSocketManager | null) {
    this._webSocketManager = manager;
  }
}

// Default status broadcaster service implementation
class StatusBroadcasterService implements IStatusBroadcasterService {
  private _statusBroadcaster: StatusBroadcaster | null = null;

  get statusBroadcaster(): StatusBroadcaster | null {
    return this._statusBroadcaster;
  }

  set statusBroadcaster(broadcaster: StatusBroadcaster | null) {
    this._statusBroadcaster = broadcaster;
  }

  get addStatusEventAndBroadcast(): (event: {
    importId: string;
    noteId?: string;
    status: NoteStatus;
    message?: string;
    context?: string;
    currentCount?: number;
    totalCount?: number;
  }) => Promise<unknown> {
    return async (event: {
      importId: string;
      noteId?: string;
      status: NoteStatus;
      message?: string;
      context?: string;
      currentCount?: number;
      totalCount?: number;
    }) => {
      const { addStatusEventAndBroadcast } = await import(
        "../utils/status-broadcaster.js"
      );
      return addStatusEventAndBroadcast(event);
    };
  }
}

// Default parser service implementation
class ParserServiceImpl implements IParserService {
  private _parsers: ParserService | null = null;

  get parsers(): ParserService | null {
    return this._parsers;
  }

  set parsers(parsers: ParserService | null) {
    this._parsers = parsers;
  }

  get parseHTML(): ((content: string) => Promise<unknown>) | undefined {
    return this._parsers?.parseHTML;
  }
}

// Main container implementation
export class ServiceContainer implements IServiceContainer {
  private static instance: ServiceContainer;

  public readonly queues: IQueueService;
  public readonly database: IDatabaseService;
  public readonly errorHandler: IErrorHandlerService;
  public readonly healthMonitor: IHealthMonitorService;
  public readonly webSocket: IWebSocketService;
  public readonly statusBroadcaster: IStatusBroadcasterService;
  public readonly parsers: IParserService;
  public readonly logger: ILoggerService;
  public readonly config: IConfigService;
  public _workers?: {
    noteWorker?: Worker;
    imageWorker?: Worker;
    ingredientWorker?: Worker;
    instructionWorker?: Worker;
    categorizationWorker?: Worker;
    sourceWorker?: Worker;
  };

  private constructor() {
    this.queues = registerQueues();
    this.database = registerDatabase();
    this.errorHandler = new ErrorHandlerService();
    this.healthMonitor = new HealthMonitorService();
    this.webSocket = new WebSocketService();
    this.statusBroadcaster = new StatusBroadcasterService();
    this.parsers = new ParserServiceImpl();
    this.logger = registerLogger(); // Use enhanced logger with file logging
    this.config = new ConfigService();

    // Initialize parsers with the actual parseHTML function
    this.parsers.parsers = {
      parseHTML: async (content: string) => {
        const { parseHTML } = await import("../parsers/html.js");
        return parseHTML(content);
      },
    };
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  // Method to reset container (useful for testing)
  static reset(): void {
    ServiceContainer.instance = new ServiceContainer();
  }

  // Method to close all resources
  async close(): Promise<void> {
    try {
      await Promise.allSettled([
        this.queues.noteQueue.close(),
        this.queues.imageQueue.close(),
        this.queues.ingredientQueue.close(),
        this.queues.instructionQueue.close(),
        this.queues.categorizationQueue.close(),
      ]);

      if (this.webSocket.webSocketManager) {
        this.webSocket.webSocketManager.close();
      }

      await this.database.prisma.$disconnect();

      this.logger.log("ServiceContainer closed successfully");
    } catch (error) {
      this.logger.log(`Error closing ServiceContainer: ${error}`, "error");
      throw error;
    }
  }
}

// Factory function to create container with custom dependencies (for testing)
export function createServiceContainer(
  overrides?: Partial<IServiceContainer>
): IServiceContainer {
  const serviceContainer = ServiceContainer.getInstance();

  if (overrides) {
    return {
      ...serviceContainer,
      ...overrides,
      close: async () => {
        // Call the overridden close methods if they exist
        if (overrides.queues) {
          await Promise.allSettled([
            overrides.queues.noteQueue.close(),
            overrides.queues.imageQueue.close(),
            overrides.queues.ingredientQueue.close(),
            overrides.queues.instructionQueue.close(),
            overrides.queues.categorizationQueue.close(),
          ]);
        }

        if (overrides.database?.prisma?.$disconnect) {
          await overrides.database.prisma.$disconnect();
        }

        if (overrides.webSocket?.webSocketManager?.close) {
          overrides.webSocket.webSocketManager.close();
        }

        if (overrides.logger?.log) {
          overrides.logger.log("ServiceContainer closed successfully");
        }
      },
    };
  }

  return serviceContainer;
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance();

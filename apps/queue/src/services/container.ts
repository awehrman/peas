import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma } from "../config/database";
import { ErrorHandler } from "../utils/error-handler";
import { HealthMonitor } from "../utils/health-monitor";

// WebSocket manager type - we'll define this locally since it's not exported
interface WebSocketManager {
  broadcastStatusEvent(event: any): void;
  getConnectedClientsCount(): number;
  close(): void;
}

// Status broadcaster interface
interface StatusBroadcaster {
  addStatusEventAndBroadcast(event: {
    noteId: string;
    status: string;
    message: string;
    context: string;
  }): Promise<any>;
}

// Parser service interface
interface ParserService {
  parseHTML: (content: string) => Promise<any>;
}
import { createQueue } from "../queues/createQueue";

// Service interfaces for dependency injection
export interface IQueueService {
  noteQueue: Queue;
  imageQueue: Queue;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  categorizationQueue: Queue;
}

export interface IDatabaseService {
  prisma: typeof prisma;
  createNote?: (file: any) => Promise<any>;
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
  addStatusEventAndBroadcast?: (event: {
    noteId: string;
    status: string;
    message: string;
    context: string;
  }) => Promise<any>;
}

export interface IParserService {
  parsers: ParserService | null;
  parseHTML?: (content: string) => Promise<any>;
}

export interface ILoggerService {
  log(message: string, level?: "info" | "warn" | "error" | string): void;
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
  close(): Promise<void>;
}

// Default logger implementation
class LoggerService implements ILoggerService {
  log(message: string, level: "info" | "warn" | "error" = "info"): void {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
    }[level];

    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}

// Default configuration service
class ConfigService implements IConfigService {
  get port(): number {
    return parseInt(process.env.PORT || "4200", 10);
  }

  get wsPort(): number {
    return parseInt(process.env.WS_PORT || "8080", 10);
  }

  get redisConnection() {
    return redisConnection;
  }

  get batchSize(): number {
    return parseInt(process.env.BATCH_SIZE || "10", 10);
  }

  get maxRetries(): number {
    return parseInt(process.env.MAX_RETRIES || "3", 10);
  }

  get backoffMs(): number {
    return parseInt(process.env.BACKOFF_MS || "1000", 10);
  }

  get maxBackoffMs(): number {
    return parseInt(process.env.MAX_BACKOFF_MS || "30000", 10);
  }
}

// Default queue service implementation
class QueueService implements IQueueService {
  public readonly noteQueue: Queue;
  public readonly imageQueue: Queue;
  public readonly ingredientQueue: Queue;
  public readonly instructionQueue: Queue;
  public readonly categorizationQueue: Queue;

  constructor() {
    this.noteQueue = createQueue("note");
    this.imageQueue = createQueue("image");
    this.ingredientQueue = createQueue("ingredient");
    this.instructionQueue = createQueue("instruction");
    this.categorizationQueue = createQueue("categorization");
  }
}

// Default database service implementation
class DatabaseService implements IDatabaseService {
  get prisma() {
    return prisma;
  }

  get createNote() {
    // Import the createNote function from the database package
    return async (file: any) => {
      const { createNote } = await import("@peas/database");
      return createNote(file);
    };
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

  get parseHTML(): ((content: string) => Promise<any>) | undefined {
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

  private constructor() {
    this.queues = new QueueService();
    this.database = new DatabaseService();
    this.errorHandler = new ErrorHandlerService();
    this.healthMonitor = new HealthMonitorService();
    this.webSocket = new WebSocketService();
    this.statusBroadcaster = new StatusBroadcasterService();
    this.parsers = new ParserServiceImpl();
    this.logger = new LoggerService();
    this.config = new ConfigService();

    // Initialize parsers with the actual parseHTML function
    this.parsers.parsers = {
      parseHTML: async (content: string) => {
        const { parseHTML } = await import("../parsers/html.js");
        return parseHTML(content);
      },
    };

    // Initialize status broadcaster with the actual function
    this.statusBroadcaster.statusBroadcaster = {
      addStatusEventAndBroadcast: async (event: any) => {
        const { addStatusEventAndBroadcast } = await import(
          "../utils/status-broadcaster.js"
        );
        return addStatusEventAndBroadcast(event);
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

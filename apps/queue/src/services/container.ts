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

export interface ILoggerService {
  log(message: string, level?: "info" | "warn" | "error"): void;
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

// Main container implementation
export class ServiceContainer implements IServiceContainer {
  private static instance: ServiceContainer;

  public readonly queues: IQueueService;
  public readonly database: IDatabaseService;
  public readonly errorHandler: IErrorHandlerService;
  public readonly healthMonitor: IHealthMonitorService;
  public readonly webSocket: IWebSocketService;
  public readonly logger: ILoggerService;
  public readonly config: IConfigService;

  private constructor() {
    this.queues = new QueueService();
    this.database = new DatabaseService();
    this.errorHandler = new ErrorHandlerService();
    this.healthMonitor = new HealthMonitorService();
    this.webSocket = new WebSocketService();
    this.logger = new LoggerService();
    this.config = new ConfigService();
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

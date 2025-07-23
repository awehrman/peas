import { PrismaClient } from "@peas/database";
import { Queue, Worker } from "bullmq";

import { HealthMonitor } from "../utils/health-monitor";

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Queue service interface with conditional typing
 */
export interface IQueueService {
  queues: {
    noteQueue: Queue;
  } & Partial<{
    imageQueue: Queue;
    ingredientQueue: Queue;
    instructionQueue: Queue;
    categorizationQueue: Queue;
    sourceQueue: Queue;
  }>;
  // Direct access for convenience
  noteQueue: Queue;
  imageQueue?: Queue;
  ingredientQueue?: Queue;
  instructionQueue?: Queue;
  categorizationQueue?: Queue;
  sourceQueue?: Queue;
}

/**
 * Database service interface
 */
export interface IDatabaseService {
  prisma: PrismaClient;
  createNote: (file: {
    title?: string;
    html: string;
    imageUrl?: string;
  }) => Promise<Record<string, unknown>>;
  createNoteCompletionTracker?: (
    noteId: string,
    totalJobs: number
  ) => Promise<Record<string, unknown>>;
  patternTracker: Record<string, unknown>;
}

/**
 * Parser service interface
 */
export interface IParserService {
  parseHTML: (content: string) => Promise<Record<string, unknown>>;
}

/**
 * Error handler service interface
 */
export interface IErrorHandlerService {
  withErrorHandling: <T>(
    operation: () => Promise<T>,
    context: Record<string, unknown>
  ) => Promise<T>;
  createJobError: (
    error: Error,
    context: Record<string, unknown>
  ) => Record<string, unknown>;
  classifyError: (error: Error) => string;
  logError: (error: Error, context: Record<string, unknown>) => void;
  // For backward compatibility
  errorHandler?: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: Record<string, unknown>
    ) => Promise<T>;
    createJobError: (
      error: Error,
      context: Record<string, unknown>
    ) => Record<string, unknown>;
    classifyError: (error: Error) => string;
    logError: (error: Error, context: Record<string, unknown>) => void;
  };
}

/**
 * Status broadcaster service interface
 */
export interface IStatusBroadcasterService {
  addStatusEventAndBroadcast: (
    event: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  // For backward compatibility
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
}

/**
 * Logger service interface
 */
export interface ILoggerService {
  log: (
    message: string,
    level?: string,
    meta?: Record<string, unknown>
  ) => void;
}

/**
 * Configuration service interface
 */
export interface IConfigService {
  wsHost?: string;
  port?: number;
  wsPort?: number;
  // Add other config properties as needed
}

/**
 * Health monitor service interface
 */
export interface IHealthMonitorService {
  healthMonitor: HealthMonitor;
}

/**
 * WebSocket service interface
 */
export interface IWebSocketService {
  webSocketManager: Record<string, unknown> | null;
}

/**
 * Main service container interface
 */
export interface IServiceContainer {
  queues: IQueueService;
  database: IDatabaseService;
  parsers: IParserService;
  errorHandler: IErrorHandlerService;
  healthMonitor: IHealthMonitorService;
  webSocket: IWebSocketService;
  statusBroadcaster: IStatusBroadcasterService;
  logger: ILoggerService;
  config: IConfigService;
  _workers?: {
    noteWorker?: Worker;
  };
  close(): Promise<void>;
}

// ============================================================================
// SERVICE IMPLEMENTATIONS
// ============================================================================

// Default queue service implementation
async function registerQueues(): Promise<IQueueService> {
  const { redisConfig } = await import("../config/redis");
  const { Queue } = await import("bullmq");

  return {
    queues: {
      noteQueue: new Queue("note", { connection: redisConfig }),
    },
    noteQueue: new Queue("note", { connection: redisConfig }),
  };
}

// Default database service implementation
async function registerDatabase(): Promise<IDatabaseService> {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  return {
    prisma,
    createNote: async (data: {
      title?: string;
      html: string;
      imageUrl?: string;
    }) => {
      return await prisma.note.create({
        data: {
          title: data.title,
          html: data.html,
          imageUrl: data.imageUrl,
        },
      });
    },
    createNoteCompletionTracker: async (noteId: string, totalJobs: number) => {
      // Implementation for note completion tracking
      return { noteId, totalJobs, completedJobs: 0 };
    },
    patternTracker: {} as Record<string, unknown>,
  };
}

// Default error handler service implementation
class ErrorHandlerService implements IErrorHandlerService {
  withErrorHandling<T>(
    operation: () => Promise<T>,
    _context?: Record<string, unknown>
  ): Promise<T> {
    return operation();
  }

  createJobError(
    error: Error,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      error: error.message,
      type: "JOB_ERROR",
      severity: "error",
      context,
      timestamp: new Date().toISOString(),
    };
  }

  classifyError(error: Error): string {
    return error.name || "UNKNOWN_ERROR";
  }

  logError(error: Error, context: Record<string, unknown>): void {
    console.error("Error occurred:", {
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  // For backward compatibility
  get errorHandler() {
    return {
      withErrorHandling: this.withErrorHandling.bind(this),
      createJobError: this.createJobError.bind(this),
      classifyError: this.classifyError.bind(this),
      logError: this.logError.bind(this),
    };
  }
}

// Default health monitor service implementation
class HealthMonitorService implements IHealthMonitorService {
  healthMonitor = HealthMonitor.getInstance();
}

// Default WebSocket service implementation
class WebSocketService implements IWebSocketService {
  webSocketManager = null;
}

// Default status broadcaster service implementation
class StatusBroadcasterService implements IStatusBroadcasterService {
  addStatusEventAndBroadcast = async (_event: Record<string, unknown>) => {
    // Default implementation - no-op
    return Promise.resolve({});
  };
}

// Default parser service implementation
class ParserServiceImpl implements IParserService {
  parsers = {
    parseHTML: async (content: string) => {
      // Default implementation - return content as-is
      return { content, parsed: true };
    },
  };

  parseHTML = async (content: string) => {
    // Direct access to parseHTML for convenience
    return this.parsers.parseHTML(content);
  };
}

// Default logger service implementation
function registerLogger(): ILoggerService {
  return {
    log: (message: string, level = "info", meta?: Record<string, unknown>) => {
      console.log(`[${level.toUpperCase()}] ${message}`, meta);
    },
  };
}

// Default config service implementation
class ConfigService implements IConfigService {
  get wsHost(): string | undefined {
    return process.env.WS_HOST;
  }

  get port(): number {
    return parseInt(process.env.PORT || "3000", 10);
  }

  get wsPort(): number {
    return parseInt(process.env.WS_PORT || "3001", 10);
  }
}

// ============================================================================
// MAIN CONTAINER CLASS
// ============================================================================

export class ServiceContainer implements IServiceContainer {
  private static instance: ServiceContainer | undefined;

  public readonly errorHandler: IErrorHandlerService;
  public readonly healthMonitor: IHealthMonitorService;
  public readonly webSocket: IWebSocketService;
  public readonly statusBroadcaster: IStatusBroadcasterService;
  public readonly parsers: IParserService;
  public readonly logger: ILoggerService;
  public readonly config: IConfigService;
  public queues!: IQueueService; // Use definite assignment assertion
  public database!: IDatabaseService; // Use definite assignment assertion
  public _workers?: {
    noteWorker?: Worker;
  };

  private constructor() {
    this.errorHandler = new ErrorHandlerService();
    this.healthMonitor = new HealthMonitorService();
    this.webSocket = new WebSocketService();
    this.statusBroadcaster = new StatusBroadcasterService();
    this.parsers = new ParserServiceImpl();
    this.logger = registerLogger();
    this.config = new ConfigService();
  }

  public static async getInstance(): Promise<ServiceContainer> {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
      ServiceContainer.instance.queues = await registerQueues();
      ServiceContainer.instance.database = await registerDatabase();
    }
    return ServiceContainer.instance;
  }

  public static reset(): void {
    ServiceContainer.instance = undefined;
  }

  public async close(): Promise<void> {
    await this.database.prisma.$disconnect();
  }
}

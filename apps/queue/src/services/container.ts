import { PrismaClient } from "@peas/database";
import { Queue, Worker } from "bullmq";

import type {
  ConfigData,
  DatabaseResult,
  JobMetadata,
  LoggerMetadata,
  OperationContext,
  StatusEventData,
} from "../types/common";
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
  }) => Promise<DatabaseResult>;
  createNoteCompletionTracker?: (
    noteId: string,
    totalJobs: number
  ) => Promise<DatabaseResult>;
  patternTracker: JobMetadata;
}

/**
 * Parser service interface
 */
export interface IParserService {
  parseHTML: (content: string) => Promise<DatabaseResult>;
}

/**
 * Error handler service interface
 */
export interface IErrorHandlerService {
  withErrorHandling: <T>(
    operation: () => Promise<T>,
    context: OperationContext
  ) => Promise<T>;
  createJobError: (error: Error, context: OperationContext) => DatabaseResult;
  classifyError: (error: Error) => string;
  logError: (error: Error, context: OperationContext) => void;
  // For backward compatibility
  errorHandler?: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: OperationContext
    ) => Promise<T>;
    createJobError: (error: Error, context: OperationContext) => DatabaseResult;
    classifyError: (error: Error) => string;
    logError: (error: Error, context: OperationContext) => void;
  };
}

/**
 * Status broadcaster service interface
 */
export interface IStatusBroadcasterService {
  addStatusEventAndBroadcast: (
    event: StatusEventData
  ) => Promise<DatabaseResult>;
  // For backward compatibility
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: StatusEventData
    ) => Promise<DatabaseResult>;
  };
}

/**
 * Logger service interface
 */
export interface ILoggerService {
  log: (message: string, level?: string, meta?: LoggerMetadata) => void;
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
  webSocketManager: ConfigData | null;
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
      const result = await prisma.note.create({
        data: {
          title: data.title,
          html: data.html,
          imageUrl: data.imageUrl,
        },
      });
      return {
        success: true,
        count: 1,
        operation: "create_note",
        table: "note",
        id: result.id,
      };
    },
    createNoteCompletionTracker: async (noteId: string, totalJobs: number) => {
      // Implementation for note completion tracking
      return {
        success: true,
        count: 1,
        operation: "create_completion_tracker",
        table: "note_completion_tracker",
        noteId,
        totalJobs,
        completedJobs: 0,
      };
    },
    patternTracker: {} as JobMetadata,
  };
}

// Default error handler service implementation
class ErrorHandlerService implements IErrorHandlerService {
  withErrorHandling<T>(
    operation: () => Promise<T>,
    _context?: OperationContext
  ): Promise<T> {
    return operation();
  }

  createJobError(error: Error, context: OperationContext): DatabaseResult {
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
  addStatusEventAndBroadcast = async (_event: StatusEventData) => {
    // Default implementation - no-op
    return Promise.resolve({
      success: true,
      count: 1,
      operation: "broadcast_status_event",
    });
  };
}

// Default parser service implementation
class ParserServiceImpl implements IParserService {
  parsers = {
    parseHTML: async (content: string) => {
      // Default implementation - return content as-is
      return {
        success: true,
        count: 1,
        operation: "parse_html",
        content,
        parsed: true,
      };
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
    log: (message: string, level = "info", meta?: LoggerMetadata) => {
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

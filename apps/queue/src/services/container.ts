import { ServiceFactory } from "./factory";

import { PrismaClient } from "@peas/database";
import { Queue, Worker } from "bullmq";

import type {
  DatabaseResult,
  JobMetadata,
  LoggerMetadata,
  OperationContext,
  StatusEventData,
} from "../types/common";
import { HealthMonitor } from "../utils/health-monitor";
import type { WebSocketManager } from "../websocket-server";

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

// Parser service removed - parsing logic is handled by Actions

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
  webSocketManager: WebSocketManager | null;
}

/**
 * Main service container interface
 */
export interface IServiceContainer {
  queues: IQueueService;
  database: IDatabaseService;
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

// Service implementations moved to factory.ts

// ============================================================================
// MAIN CONTAINER CLASS
// ============================================================================

export class ServiceContainer implements IServiceContainer {
  private static instance: ServiceContainer | undefined;

  public readonly errorHandler: IErrorHandlerService;
  public readonly healthMonitor: IHealthMonitorService;
  public readonly webSocket: IWebSocketService;
  public readonly statusBroadcaster: IStatusBroadcasterService;
  public readonly logger: ILoggerService;
  public readonly config: IConfigService;
  public queues!: IQueueService; // Use definite assignment assertion
  public database!: IDatabaseService; // Use definite assignment assertion
  public _workers?: {
    noteWorker?: Worker;
  };

  private constructor() {
    this.errorHandler = ServiceFactory.createErrorHandler();
    this.healthMonitor = ServiceFactory.createHealthMonitor();
    this.webSocket = ServiceFactory.createWebSocketService();
    this.statusBroadcaster = ServiceFactory.createStatusBroadcaster();
    this.logger = ServiceFactory.createLoggerService();
    this.config = ServiceFactory.createConfigService();
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

import { ServiceFactory } from "./factory";
import { registerDatabase } from "./register-database";
import { registerQueues } from "./register-queues";

import type {
  NoteWithParsedLines,
  ParsedHTMLFile,
  PrismaClient,
} from "@peas/database";
import type { Queue, Worker } from "bullmq";

import type { OperationContext } from "../types/common";
import type { PatternTracker } from "../workers/shared/pattern-tracker";

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Queue service interface
 */
export interface IQueueService {
  noteQueue: Queue;
  imageQueue: Queue;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  categorizationQueue: Queue;
  sourceQueue: Queue;
  patternTrackingQueue: Queue;
}

/**
 * Database service interface
 */
export interface IDatabaseService {
  prisma: PrismaClient;
  patternTracker: PatternTracker;
  createNote?: (file: ParsedHTMLFile) => Promise<NoteWithParsedLines>;
  createNoteCompletionTracker?: (
    noteId: string,
    totalJobs: number
  ) => Promise<Record<string, unknown>>;
  updateNoteCompletionTracker?: (
    noteId: string,
    completedJobs: number
  ) => Promise<Record<string, unknown>>;
  incrementNoteCompletionTracker?: (
    noteId: string
  ) => Promise<Record<string, unknown>>;
  checkNoteCompletion?: (noteId: string) => Promise<{
    isComplete: boolean;
    completedJobs: number;
    totalJobs: number;
  }>;
  getNoteTitle?: (noteId: string) => Promise<string | null>;
  updateInstructionLine?: (
    id: string,
    data: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  createInstructionSteps?: (
    steps: Array<Record<string, unknown>>
  ) => Promise<Record<string, unknown>>;
}

/**
 * Error handler service interface
 */
export interface IErrorHandlerService {
  withErrorHandling: <T>(
    operation: () => Promise<T>,
    context: OperationContext
  ) => Promise<T>;
  createJobError: (
    error: Error,
    context: OperationContext
  ) => Record<string, unknown>;
  classifyError: (error: Error) => string;
  logError: (error: Error, context: OperationContext) => void;
  errorHandler?: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: OperationContext
    ) => Promise<T>;
    createJobError: (
      error: Error,
      context: OperationContext
    ) => Record<string, unknown>;
    classifyError: (error: Error) => string;
    logError: (error: Error, context: OperationContext) => void;
  };
}

/**
 * Status broadcaster service interface
 */
export interface IStatusBroadcasterService {
  addStatusEventAndBroadcast: (
    event: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
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
}

/**
 * Health monitor service interface
 */
export interface IHealthMonitorService {
  healthMonitor: unknown;
}

/**
 * WebSocket service interface
 */
export interface IWebSocketService {
  webSocketManager: unknown;
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
    imageWorker?: Worker;
  };
  close(): Promise<void>;
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
  public readonly logger: ILoggerService;
  public readonly config: IConfigService;
  public queues!: IQueueService;
  public database!: IDatabaseService;
  public _workers?: {
    noteWorker?: Worker;
    imageWorker?: Worker;
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
      ServiceContainer.instance.queues = registerQueues();
      ServiceContainer.instance.database = registerDatabase();
    }
    return ServiceContainer.instance;
  }

  public static reset(): void {
    ServiceContainer.instance = undefined;
  }

  public async close(): Promise<void> {
    if (this.database?.prisma?.$disconnect) {
      await this.database.prisma.$disconnect();
    }
  }
}

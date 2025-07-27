// ============================================================================
// SERVICE LAYER EXPORTS
// ============================================================================

// Core service container
export { ServiceContainer, type IServiceContainer } from "./container";

// Service factory
export { ServiceFactory } from "./factory";

// Service interfaces
export type {
  IQueueService,
  IDatabaseService,
  IErrorHandlerService,
  IStatusBroadcasterService,
  ILoggerService,
  IConfigService,
  IHealthMonitorService,
  IWebSocketService,
} from "./container";

// Service implementations
export {
  DatabaseService,
  type IDatabaseService as DatabaseServiceInterface,
} from "./register-database";
export {
  QueueService,
  type IQueueService as QueueServiceInterface,
} from "./register-queues";
export { EnhancedLoggerService } from "../utils/logger";

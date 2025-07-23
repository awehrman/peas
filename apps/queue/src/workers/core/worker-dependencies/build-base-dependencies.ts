import type { IServiceContainer } from "../../../services/container";
import type { OperationContext, StatusEventData } from "../../../types/common";
import type { BaseWorkerDependencies } from "../../types";

/**
 * Build base dependencies for workers
 */
export function buildBaseDependencies(
  container: IServiceContainer
): BaseWorkerDependencies {
  return {
    logger: {
      log: (
        message: string,
        level?: string,
        meta?: Record<string, unknown>
      ) => {
        container.logger.log(message, level, meta);
      },
    },
    errorHandler: {
      withErrorHandling: async <T>(
        operation: () => Promise<T>,
        context: Record<string, unknown>
      ): Promise<T> => {
        // Convert Record<string, unknown> to OperationContext
        const operationContext: OperationContext = {
          operation: (context.operation as string) || "unknown",
          timestamp: new Date(),
          ...context,
        };
        return container.errorHandler.withErrorHandling(
          operation,
          operationContext
        );
      },
      createJobError: (
        error: Error,
        context: Record<string, unknown>
      ): Record<string, unknown> => {
        // Convert Record<string, unknown> to OperationContext
        const operationContext: OperationContext = {
          operation: (context.operation as string) || "unknown",
          timestamp: new Date(),
          ...context,
        };
        return container.errorHandler.createJobError(error, operationContext);
      },
      classifyError: (error: Error): string => {
        return container.errorHandler.classifyError(error);
      },
      logError: (error: Error, context: Record<string, unknown>): void => {
        // Convert Record<string, unknown> to OperationContext
        const operationContext: OperationContext = {
          operation: (context.operation as string) || "unknown",
          timestamp: new Date(),
          ...context,
        };
        container.errorHandler.logError(error, operationContext);
      },
    },
    statusBroadcaster: {
      addStatusEventAndBroadcast: async (
        event: Record<string, unknown>
      ): Promise<Record<string, unknown>> => {
        // Convert Record<string, unknown> to StatusEventData
        const statusEvent: StatusEventData = {
          type: (event.type as string) || "status",
          message: (event.message as string) || "",
          severity:
            (event.severity as "info" | "warn" | "error" | "critical") ||
            "info",
          ...event,
        };
        return container.statusBroadcaster.addStatusEventAndBroadcast(
          statusEvent
        );
      },
    },
    queues: {
      noteQueue: container.queues.noteQueue,
      imageQueue: container.queues.imageQueue,
      ingredientQueue: container.queues.ingredientQueue,
      instructionQueue: container.queues.instructionQueue,
      categorizationQueue: container.queues.categorizationQueue,
      sourceQueue: container.queues.sourceQueue,
    },
  };
}

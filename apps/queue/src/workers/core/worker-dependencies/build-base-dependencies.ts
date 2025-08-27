import type { IServiceContainer } from "../../../services/container";
import type { OperationContext } from "../../../types/common";
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
        // The statusBroadcaster expects specific parameters, not a generic Record
        const {
          importId,
          noteId,
          status,
          message,
          context,
          currentCount,
          totalCount,
          indentLevel,
          metadata,
        } = event;

        return container.statusBroadcaster.addStatusEventAndBroadcast({
          importId: importId as string,
          noteId: noteId as string | undefined,
          status: status as string,
          message: message as string | undefined,
          context: context as string | undefined,
          currentCount: currentCount as number | undefined,
          totalCount: totalCount as number | undefined,
          indentLevel: indentLevel as number | undefined,
          metadata: metadata as Record<string, unknown> | undefined,
        });
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

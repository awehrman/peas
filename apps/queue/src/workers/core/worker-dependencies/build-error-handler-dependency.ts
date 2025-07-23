/**
 * Build error handler dependency
 */
import type { IServiceContainer } from "../../../services/container";
import type { ErrorContext } from "../../types";
import type { OperationContext } from "../../../types/common";

export function buildErrorHandlerDependency(container: IServiceContainer) {
  return {
    withErrorHandling: async <T>(
      operation: () => Promise<T>,
      context?: ErrorContext
    ): Promise<T> => {
      // Convert ErrorContext to OperationContext with required timestamp
      const operationContext: OperationContext = {
        operation: context?.operation || "unknown",
        timestamp: new Date(),
        ...context,
      };
      return container.errorHandler.withErrorHandling(operation, operationContext);
    },
    createJobError: (
      error: Error,
      context?: ErrorContext
    ): Record<string, unknown> => {
      // Convert ErrorContext to OperationContext with required timestamp
      const operationContext: OperationContext = {
        operation: context?.operation || "unknown",
        timestamp: new Date(),
        ...context,
      };
      return container.errorHandler.createJobError(error, operationContext);
    },
    classifyError: (error: Error): string => {
      return container.errorHandler.classifyError(error);
    },
    logError: (error: Error, context?: ErrorContext): void => {
      // Convert ErrorContext to OperationContext with required timestamp
      const operationContext: OperationContext = {
        operation: context?.operation || "unknown",
        timestamp: new Date(),
        ...context,
      };
      container.errorHandler.logError(error, operationContext);
    },
  };
}

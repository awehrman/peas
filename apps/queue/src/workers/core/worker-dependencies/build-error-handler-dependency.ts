/**
 * Builds the error handler dependency from the service container.
 */
import type { IServiceContainer } from "../../../services/container";
import type { ErrorContext } from "../../types";

export function buildErrorHandlerDependency(container: IServiceContainer) {
  if (!container) {
    throw new Error("Container not available for error handler");
  }

  return {
    withErrorHandling: async <T>(
      operation: () => Promise<T>,
      context?: ErrorContext
    ): Promise<T> => {
      if (container.errorHandler?.withErrorHandling) {
        return container.errorHandler.withErrorHandling(
          operation,
          context ?? {}
        );
      } else {
        // Fallback implementation
        return operation();
      }
    },
  };
}

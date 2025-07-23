import type { NoteStatus } from "@peas/database";

import type { IServiceContainer } from "../../../services/container";
import type { ErrorContext } from "../../types";

/**
 * Static helper to create base dependencies from a container
 */
export function createBaseDependenciesFromContainer(
  container: IServiceContainer
) {
  return {
    addStatusEventAndBroadcast: async (event: {
      importId: string;
      noteId?: string;
      status: NoteStatus;
      message?: string;
      context?: string;
      currentCount?: number;
      totalCount?: number;
      indentLevel?: number;
    }): Promise<void> => {
      if (container.statusBroadcaster?.addStatusEventAndBroadcast) {
        await container.statusBroadcaster.addStatusEventAndBroadcast(
          event as unknown as Record<string, unknown>
        );
      }
      // Always return void
    },
    ErrorHandler: {
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
    },
    logger: container.logger,
  };
}

/**
 * Builds the status broadcaster dependency from the service container.
 */
import type { NoteStatus } from "@peas/database";

import type { IServiceContainer } from "../../../services/container";

export function buildStatusBroadcasterDependency(container: IServiceContainer) {
  if (!container) {
    throw new Error("Container not available for status broadcaster");
  }
  return async (event: {
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
  };
}

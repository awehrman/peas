/**
 * Build status broadcaster dependency
 */
import type { IServiceContainer } from "../../../services/container";
import type { StatusEventData } from "../../../types/common";

/**
 * Build status broadcaster dependency
 */
export function buildStatusBroadcasterDependency(container: IServiceContainer) {
  return {
    addStatusEventAndBroadcast: async (
      event: Record<string, unknown>
    ): Promise<void> => {
      // Convert Record<string, unknown> to StatusEventData
      const statusEvent: StatusEventData = {
        type: (event.type as string) || "status",
        message: (event.message as string) || "",
        severity:
          (event.severity as "info" | "warn" | "error" | "critical") || "info",
        ...event,
      };
      await container.statusBroadcaster.addStatusEventAndBroadcast(statusEvent);
    },
  };
}

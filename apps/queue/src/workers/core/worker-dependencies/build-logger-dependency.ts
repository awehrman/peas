/**
 * Builds the logger dependency from the service container.
 */
import type { IServiceContainer } from "../../../services/container";

export function buildLoggerDependency(container: IServiceContainer) {
  if (!container) {
    throw new Error("Container not available for logger");
  }
  return container.logger;
}

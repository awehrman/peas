import { ErrorHandler } from "../../utils/error-handler";
import { HealthMonitor } from "../../utils/health-monitor";
import { ValidationError } from "../../types";

export function validateNoteJobData(
  jobData: unknown,
  errorHandler: typeof ErrorHandler
): ValidationError | null {
  return errorHandler.validateJobData(jobData, ["content"]);
}

export async function checkServiceHealth(
  healthMonitor: typeof HealthMonitor
): Promise<boolean> {
  const monitor = healthMonitor.getInstance();
  return await monitor.isHealthy();
}

/**
 * Worker and action metrics utilities for tracking execution times, status, and health.
 */
export class WorkerMetrics {
  private static actionExecutionTimes: Record<string, number[]> = {};
  private static jobProcessingTimes: Record<string, number[]> = {};
  private static workerStatus: Record<string, boolean> = {};

  static recordActionExecutionTime(
    actionName: string,
    duration: number,
    _success: boolean
  ) {
    if (!this.actionExecutionTimes[actionName]) {
      this.actionExecutionTimes[actionName] = [];
    }
    this.actionExecutionTimes[actionName]?.push(duration);
    // Optionally, record success/failure counts
  }

  static recordJobProcessingTime(
    workerName: string,
    duration: number,
    _success: boolean
  ) {
    if (!this.jobProcessingTimes[workerName]) {
      this.jobProcessingTimes[workerName] = [];
    }
    this.jobProcessingTimes[workerName]?.push(duration);
    // Optionally, record success/failure counts
  }

  static recordWorkerStatus(workerName: string, isRunning: boolean) {
    this.workerStatus[workerName] = isRunning;
  }

  static getActionExecutionTimes(actionName: string): number[] {
    return this.actionExecutionTimes[actionName] || [];
  }

  static getJobProcessingTimes(workerName: string): number[] {
    return this.jobProcessingTimes[workerName] || [];
  }

  static getWorkerStatus(workerName: string): boolean {
    return this.workerStatus[workerName] || false;
  }
}

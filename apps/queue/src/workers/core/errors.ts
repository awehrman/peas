/**
 * Base error class for worker-related errors
 */
export class WorkerError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly jobId?: string
  ) {
    super(message);
    this.name = "WorkerError";
  }
}

/**
 * Error thrown during note processing
 */
export class NoteProcessingError extends WorkerError {
  constructor(
    message: string,
    operation: string,
    public readonly noteId?: string,
    jobId?: string
  ) {
    super(message, operation, jobId);
    this.name = "NoteProcessingError";
  }
}

/**
 * Error thrown when action validation fails
 */
export class ActionValidationError extends WorkerError {
  constructor(
    message: string,
    operation: string,
    public readonly actionName: string,
    jobId?: string
  ) {
    super(message, operation, jobId);
    this.name = "ActionValidationError";
  }
}

/**
 * Error thrown when action execution fails
 */
export class ActionExecutionError extends WorkerError {
  constructor(
    message: string,
    operation: string,
    public readonly actionName: string,
    public readonly originalError?: Error,
    jobId?: string
  ) {
    super(message, operation, jobId);
    this.name = "ActionExecutionError";
  }
}

/**
 * Error thrown when dependencies are missing
 */
export class MissingDependencyError extends WorkerError {
  constructor(
    message: string,
    operation: string,
    public readonly dependencyName: string,
    jobId?: string
  ) {
    super(message, operation, jobId);
    this.name = "MissingDependencyError";
  }
}

/**
 * Error thrown when service is unhealthy
 */
export class ServiceUnhealthyError extends WorkerError {
  constructor(
    message: string,
    operation: string,
    public readonly healthCheck: string,
    jobId?: string
  ) {
    super(message, operation, jobId);
    this.name = "ServiceUnhealthyError";
  }
}

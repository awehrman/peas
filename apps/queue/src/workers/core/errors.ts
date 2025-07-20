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

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      jobId: this.jobId,
    };
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

  toJSON() {
    return {
      ...super.toJSON(),
      noteId: this.noteId,
    };
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

  toJSON() {
    return {
      ...super.toJSON(),
      actionName: this.actionName,
    };
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

  toJSON() {
    return {
      ...super.toJSON(),
      actionName: this.actionName,
      originalError: this.originalError?.message,
    };
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

  toJSON() {
    return {
      ...super.toJSON(),
      dependencyName: this.dependencyName,
    };
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

  toJSON() {
    return {
      ...super.toJSON(),
      healthCheck: this.healthCheck,
    };
  }
}

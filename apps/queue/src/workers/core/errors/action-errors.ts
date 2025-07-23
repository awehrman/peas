/**
 * Error thrown when an action fails during execution.
 */
export class ActionExecutionError extends Error {
  public operation: string;
  public action: string;
  public originalError: Error;
  public jobId?: string;

  constructor(
    message: string,
    operation: string,
    action: string,
    originalError: Error,
    jobId?: string
  ) {
    super(message);
    this.name = "ActionExecutionError";
    this.operation = operation;
    this.action = action;
    this.originalError = originalError;
    this.jobId = jobId;
  }
}

/**
 * Error thrown when an action is not registered in the factory.
 */
export class ActionNotRegisteredError extends Error {
  constructor(actionName: string) {
    super(`Action '${actionName}' is not registered in the ActionFactory.`);
    this.name = "ActionNotRegisteredError";
  }
}

/**
 * Error thrown when validation fails for an action's input.
 */
export class ActionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionValidationError";
  }
}
